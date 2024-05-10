const path = require("path");
const { StatusCodes } = require("http-status-codes");

const asyncWrapper = require("../middleware/async.js");

// Cache for metro info
const { readFromCache } = require("../cache/cacheFuncs.js");

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

  // Helper function to get station info from id
  function getStationInfoFromId(id) {
    return stationInfo.find((station) => station.id === id);
  }

  // Start and end station ids
  const start_id = req.params.startId;
  const end_id = req.params.endId;

  // Get station info for start and end
  const start_station = getStationInfoFromId(start_id);
  const end_station = getStationInfoFromId(end_id);

  // Check if stations are valid
  if (!start_station || !end_station) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid start or end station id" });
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

  // Initialize visited and univisted stations
  const visited = new Set();
  const univisited = new Set();
  stationInfo.forEach((station) => {
    univisited.add(station.id);
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
  while (!visited.has(end_id) && univisited.size > 0) {
    // Visit unvisited vertex with smallest distance from start
    let cur_id = null;
    let cur_distance = Infinity;

    for (const station_id in dijkstras_hashmap) {
      if (univisited.has(station_id)) {
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
      if (univisited.has(neighbor_id)) {
        // Neighbor info
        const { distance, connectingLines } = neighbors[neighbor_id];

        // BIG THING: ADDS PENALTY FOR TRANSFERRING LINES
        const penalty = dijkstras_hashmap[cur_id].prev_lines.some((id) =>
          connectingLines.includes(id)
        )
          ? 0
          : 5;

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
    univisited.delete(cur_id);
    visited.add(cur_id);
  }

  // If the end station hasn't been visited there's no solution
  if (univisited.has(end_id)) return res.status(StatusCodes.OK).json([]);

  // Recover solution from traceback
  const solution = [];
  let cur_id = end_id;
  while (cur_id !== START_PREV_ID) {
    // Get dijkstra's hashmap for current station
    const { prev_id, prev_lines } = dijkstras_hashmap[cur_id];
    const append = { cur_id, prev_lines };
    // let append = cur_id;
    solution.push(append);
    cur_id = prev_id;
  }
  solution.reverse();

  res.status(StatusCodes.OK).json(solution);
});

module.exports = { getInfo, getRoute };
