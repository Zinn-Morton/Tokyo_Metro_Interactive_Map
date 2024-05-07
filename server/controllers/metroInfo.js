const path = require("path");
const { StatusCodes } = require("http-status-codes");

const asyncWrapper = require("../middleware/async.js");

// Cache for metro info
const { readFromCache } = require("../cache/cacheFuncs.js");

// Sends metro info to frontend
const getInfo = asyncWrapper(async (req, res) => {
  // Metro info
  let metro_info = await readFromCache(process.env.METRO_INFO_CACHE_FILE_PATH);

  // Translation info
  const station_translate_info = await readFromCache(
    process.env.STATION_TRANSLATE_CACHE_FILE_PATH
  );
  const line_translate_info = await readFromCache(
    process.env.LINE_TRANSLATE_CACHE_FILE_PATH
  );

  // Add machine learning translate notice
  function markMLTranslate(translations) {
    for (let translation in translations) {
      translations[translation]["ko"] += " [기계 번역]";
      translations[translation]["zh-Hans"] += " [机器翻译]";
      translations[translation]["zh-Hant"] += " [機器翻譯]";
    }
  }

  markMLTranslate(station_translate_info);
  markMLTranslate(line_translate_info);

  // Embed translations into metro_info
  function embedTranslations(data, translations) {
    data = data.map((item) => {
      if (!item.name["ko"]) item.name["ko"] = translations[item.id]["ko"];

      if (!item.name["zh-Hans"])
        item.name["zh-Hans"] = translations[item.id]["zh-Hans"];

      if (!item.name["zh-Hant"])
        item.name["zh-Hant"] = translations[item.id]["zh-Hant"];

      return item;
    });
  }

  embedTranslations(metro_info.stationInfo, station_translate_info);
  embedTranslations(metro_info.lineInfo, line_translate_info);

  // Send to frontend
  res.status(StatusCodes.OK).json(metro_info);
});

module.exports = { getInfo };
