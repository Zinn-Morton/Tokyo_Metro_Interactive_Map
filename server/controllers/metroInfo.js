const path = require("path");
const { StatusCodes } = require("http-status-codes");

const asyncWrapper = require("../middleware/async.js");

// Cache for metro info
const { readFromCache } = require("../cache/cacheFuncs.js");

// Sends metro info to frontend
const getInfo = asyncWrapper(async (req, res) => {
  // Get metro info from cache
  let metro_info = await readFromCache(process.env.METRO_INFO_CACHE_FILE_PATH);

  // Send to frontend
  res.status(StatusCodes.OK).json(metro_info);
});

module.exports = { getInfo };
