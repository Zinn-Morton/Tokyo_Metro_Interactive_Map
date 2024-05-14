const path = require("path");
const { StatusCodes } = require("http-status-codes");

const asyncWrapper = require("../middleware/async.js");

// Cache for metro info
const { readFromCache } = require("../cache/cacheFuncs.js");

// My functions
const {
  getDirectionStation,
  getStationFromId,
} = require("../functions/metroLookupFuncs.js");
const { getArrIntersection } = require("../functions/arrFuncs.js");

// Sends metro info to frontend
const getInfo = asyncWrapper(async (req, res) => {
  // Get metro info from cache
  const { stationInfo, lineInfo, stationToCoords, operators } =
    await readFromCache(process.env.METRO_INFO_CACHE_FILE_PATH);

  const ret = { stationInfo, lineInfo, stationToCoords, operators };

  // Send to frontend
  res.status(StatusCodes.OK).json(ret);
});

// Gets the route between two locations
const getRoute = asyncWrapper(async (req, res) => {
  // Get metro info from cache
  const { stationInfo, lineInfo, adjList } = await readFromCache(
    process.env.METRO_INFO_CACHE_FILE_PATH
  );

  // Get station info for start and end
  const start_station = getStationFromId(stationInfo, req.params.startId);
  const end_station = getStationFromId(stationInfo, req.params.endId);

  // Check if stations are valid
  if (!start_station || !end_station) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid start or end station name" });
  }

  // Start and end station ids
  const start_id = start_station.id;
  const end_id = end_station.id;

  // If the same station no need to get directions
  if (start_id === end_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Same start and end station" });
  }

  // Dijkstra's algorithm to find shortest path

  // Initialize hashmap to store station id => {shortest distance, previous vertex}
  const dijkstras_hashmap = {};
  stationInfo.forEach((station) => {
    dijkstras_hashmap[station.id] = {
      shortest_distance: Infinity,
      prev_id: null,
    };
  });

  // Initialize univisted stations
  const unvisited = new Set();
  stationInfo.forEach((station) => {
    unvisited.add(station.id);
  });

  // Initialize start station dijkstra's entry
  const START_PREV_ID = -1;
  dijkstras_hashmap[start_id] = {
    shortest_distance: 0,
    prev_id: START_PREV_ID,
    prev_lines: [],
    // prev_lines: stationInfo
    //   .find((station) => station.id === start_id)
    //   .railways.map((railway) => railway.id),
  };

  // Repeat until destination has been marked visited or there are no more stations to visit
  while (unvisited.has(end_id) && unvisited.size > 0) {
    // Visit unvisited vertex with smallest distance from start
    let cur_id = null;
    let cur_distance = Infinity;

    for (const station_id in dijkstras_hashmap) {
      if (unvisited.has(station_id)) {
        const { shortest_distance } = dijkstras_hashmap[station_id];
        if (shortest_distance < cur_distance) {
          cur_id = station_id;
          cur_distance = shortest_distance;
        }
      }
    }

    // If cur_id is still null then the nodes reachable from start have all been visited. Exit
    if (!cur_id) break;

    // Examine unvisited neighbors
    const neighbors = adjList[cur_id];
    for (const neighbor_id in neighbors) {
      if (unvisited.has(neighbor_id)) {
        // Neighbor info
        const { distance, connectingLines } = neighbors[neighbor_id];

        // BIG THING: ADDS PENALTY FOR TRANSFERRING LINES
        const transfrered = !dijkstras_hashmap[cur_id].prev_lines.some((id) =>
          connectingLines.includes(id)
        );
        const penalty = transfrered ? 5 : 0;

        // Calculate distance from start to neighbor
        const distance_from_start = cur_distance + distance + penalty;

        // If this distance is less than the current known shortest distance then update
        if (
          distance_from_start < dijkstras_hashmap[neighbor_id].shortest_distance
        ) {
          dijkstras_hashmap[neighbor_id].shortest_distance =
            distance_from_start;
          dijkstras_hashmap[neighbor_id].prev_id = cur_id;
          dijkstras_hashmap[neighbor_id].prev_lines = connectingLines;
        }
      }
    }

    // Move from unvisited to visited
    unvisited.delete(cur_id);
  }

  // If the end station hasn't been visited there's no solution
  if (unvisited.has(end_id)) return res.status(StatusCodes.OK).json([]);

  // Recover solution from traceback
  const END_ID = "END_STATION_ID";
  let solution = [{ cur_id: END_ID, prev_lines: [] }];
  let cur_id = end_id;
  while (cur_id !== START_PREV_ID) {
    // Get dijkstra's hashmap for current station
    const { prev_id, prev_lines } = dijkstras_hashmap[cur_id];
    const append = { cur_id, prev_lines };
    // let append = cur_id;
    solution.push(append);
    cur_id = prev_id;
  }

  // Fix solution to have only one prev_line entry at each entry
  function fixPassthrough(solution) {
    for (let i = 1; i < solution.length; i++) {
      const cur = solution[i];
      const prev = solution[i - 1];

      // If there is overlap between an entry and the previous then take the overlap
      const overlap = getArrIntersection(cur.prev_lines, prev.prev_lines);
      if (overlap.length > 0) {
        cur.prev_lines = overlap;
      }
    }
  }

  // One passthrough backwards and forwards
  fixPassthrough(solution);
  fixPassthrough(solution.reverse());

  // For all remaining prev_lines with length > 1 we can take any line
  solution.forEach((value) => {
    value.prev_lines = value.prev_lines.length > 0 ? value.prev_lines[0] : [];
  });

  // Pop dummy last station
  solution.pop();

  // Instead of prev_line use next_line. Move all prev_line back one entry
  const station_list = [];
  for (let i = 0; i < solution.length - 1; i++) {
    station_list.push({
      id: solution[i].cur_id,
      next_line: solution[i + 1].prev_lines,
    });
  }
  station_list.push({
    id: solution[solution.length - 1].cur_id,
    next_line: null,
  });

  // Convert route result into readable format (trip legs)
  const trip_legs = [];

  let cur_leg_start = station_list[0].id;
  let cur_leg_line = station_list[0].next_line;
  let leg_stops = 0;
  for (let i = 1; i < solution.length; i++) {
    const cur_station = station_list[i];
    leg_stops++;

    // If transfer track the leg
    if (cur_station.next_line !== cur_leg_line) {
      trip_legs.push({
        start_id: cur_leg_start,
        end_id: cur_station.id,
        line_id: cur_leg_line,
        stops: leg_stops,
      });

      // Update current leg variables
      cur_leg_start = cur_station.id;
      cur_leg_line = cur_station.next_line;
      leg_stops = 0;
    }
  }

  // Add direction of travel to trip legs
  trip_legs.forEach((leg) => {
    leg.towards_station_id = getDirectionStation(
      { stationInfo, lineInfo },
      leg.line_id,
      leg.start_id,
      leg.end_id
    ).id;
  });

  res
    .status(StatusCodes.OK)
    .json({ station_list: station_list, trip_legs: trip_legs });
});

module.exports = { getInfo, getRoute };
