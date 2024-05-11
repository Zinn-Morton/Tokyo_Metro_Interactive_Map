const path = require("path");
const { StatusCodes } = require("http-status-codes");

const asyncWrapper = require("../middleware/async.js");

// Cache for metro info
const { readFromCache } = require("../cache/cacheFuncs.js");

// Language list
const language_list = ["en", "ja", "ko", "zh-Hans", "zh-Hant"];

// Sends metro info to frontend
const getInfo = asyncWrapper(async (req, res) => {
  // Get metro info from cache
  let ret = ({ stationInfo, lineInfo, stationToCoords, operators } =
    await readFromCache(process.env.METRO_INFO_CACHE_FILE_PATH));

  // Send to frontend
  res.status(StatusCodes.OK).json(ret);
});

// Gets the route between two locations
const getRoute = asyncWrapper(async (req, res) => {
  // Get metro info from cache
  const { stationInfo, adjList } = await readFromCache(
    process.env.METRO_INFO_CACHE_FILE_PATH
  );

  // Helper function to get station info from name
  // Handles casing differences
  function getStationFromName(name) {
    for (station of stationInfo) {
      for (const language of language_list) {
        if (station.name[language].toLowerCase() === name.toLowerCase())
          return station;
      }
    }

    return null;
  }

  // Get station info for start and end
  const start_station = getStationFromName(req.params.startName);
  const end_station = getStationFromName(req.params.endName);

  console.log(start_station, end_station);

  // Check if stations are valid
  if (!start_station || !end_station) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid start or end station name" });
  }

  // Start and end station ids
  const start_id = start_station.id;
  const end_id = end_station.id;

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
  const solution = [{ cur_id: END_ID, prev_lines: [] }];
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
      function getOverlap(arr1, arr2) {
        return arr1.filter((value) => arr2.includes(value));
      }

      const overlap = getOverlap(cur.prev_lines, prev.prev_lines);
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

  // Rename prev_lines to prev_line for simplicity for frontend
  function renameKey(obj, key_name, new_key) {
    if (obj.hasOwnProperty(key_name)) {
      obj[new_key] = obj[key_name];
      delete obj[key_name];
    }

    return obj;
  }

  const ret = solution.map((value) => {
    return renameKey(value, "prev_lines", "prev_line");
  });

  res.status(StatusCodes.OK).json(ret);
});

module.exports = { getInfo, getRoute };
