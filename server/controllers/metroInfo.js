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

  res.status(StatusCodes.OK).json(adjList);
});

module.exports = { getInfo, getRoute };
