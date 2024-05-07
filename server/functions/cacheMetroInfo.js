const fs = require("fs");
const path = require("path");
const axios = require("axios");
const lodash = require("lodash");

// Cache
const { readFromCache, writeToCache } = require("../cache/cacheFuncs.js");

// Translate
const { translate } = require("../functions//translate.js");

// Caches these 4 things:

// Gets all unique stations
// Caches id, geocoords, name in multiple languages, which lines it connects to, and line codes for the lines it connects to

// Gets all lines
// Caches id, name in multiple languages, color, code, and station order

// Caches a object mapping station id to coords

// For all stations/lines without a chinese or korean name, caches generated translations
async function cacheMetroInfo() {
  // Get info about lines
  // Sources (respectively):
  // https://ckan.odpt.org/en/dataset/r_route-tokyometro/resource/81d953eb-65f8-4dfd-ba99-cd43d41e8b9b
  // https://ckan.odpt.org/en/dataset/r_station-toei/resource/4e2c86aa-188d-4101-8752-777428a524b1
  const line_api_urls = [
    `https://api.odpt.org/api/v4/odpt:Railway?odpt:operator=odpt.Operator:TokyoMetro&acl:consumerKey=${process.env.ODPT_TOKEN}`,
    "https://api-public.odpt.org/api/v4/odpt:Railway",
  ];
  const { line_info, line_id_to_code } = await getLineInfo(line_api_urls);

  // Get info about stations
  // Sources (respectively):
  // https://ckan.odpt.org/en/dataset/r_station-tokyometro/resource/9a17b58f-9258-431b-a006-add6eb0cacc6
  // https://ckan.odpt.org/en/dataset/r_route-toei/resource/b820e9ed-997f-418b-ae69-9e37dce68177
  const station_api_urls = [
    `https://api.odpt.org/api/v4/odpt:Station?odpt:operator=odpt.Operator:TokyoMetro&acl:consumerKey=${process.env.ODPT_TOKEN}`,
    "https://api-public.odpt.org/api/v4/odpt:Station",
  ];
  const { unique_stations, station_to_coords } = await getStationInfo({
    station_api_urls,
    line_info,
    line_id_to_code,
  });

  // Generate and cache translations for stations/lines without a korean/chinese name
  await cacheTranslations(
    unique_stations,
    process.env.STATION_TRANSLATE_CACHE_FILE_PATH
  );
  await cacheTranslations(
    line_info,
    process.env.LINE_TRANSLATE_CACHE_FILE_PATH
  );

  // Package return for frontend
  const ret = {
    stationInfo: unique_stations,
    lineInfo: line_info,
    stationToCoords: station_to_coords,
  };

  await writeToCache(ret, process.env.METRO_INFO_CACHE_FILE_PATH);
}

// Helper function to get line info for getInfo
async function getLineInfo(line_api_urls) {
  // Get line info from all APIs
  const axios_promises = line_api_urls.map((url) => axios.get(url));
  const responses = await Promise.all(axios_promises);
  const response_line = responses.flatMap((response) => response.data);

  // Hashmap for line id to code
  const line_id_to_code = new Map();

  // Extracts needed info from response_line
  const line_info = response_line.map((item) => {
    let extracted_data = {
      id: item["owl:sameAs"],
      name: {
        en: item[`odpt:railwayTitle`].en,
        ja: item[`odpt:railwayTitle`].ja,
        ko: item[`odpt:railwayTitle`].ko,
        "zh-Hans": item[`odpt:railwayTitle`][`zh-Hans`],
        "zh-Hant": item[`odpt:railwayTitle`][`zh-Hant`],
      },
      color: item["odpt:color"],
      code: item["odpt:lineCode"],
      stationOrder: item["odpt:stationOrder"].map((station) => {
        return {
          index: station["odpt:index"],
          station: station["odpt:station"].split(".").pop(),
        };
      }),
      shown: true,
    };

    // For some reason Marunouchi branch doesn't have chinese or korean names
    if (extracted_data.id === "odpt.Railway:TokyoMetro.MarunouchiBranch") {
      extracted_data.name.ko = "마루노우치선 지선";
      extracted_data.name["zh-Hans"] = "丸之内支线";
      extracted_data.name["zh-Hant"] = "丸之内支線";
    }

    // Fix Sakura Tram color
    if (extracted_data.id === "odpt.Railway:Toei.Arakawa") {
      extracted_data.color = "#F4477A";
    }

    // Fix Nippori-Toneri Liner color
    if (extracted_data.id === "odpt.Railway:Toei.NipporiToneri") {
      extracted_data.color = "#D142A1";
    }

    line_id_to_code.set(extracted_data.id, extracted_data.code);

    return extracted_data;
  });

  // console.log(await translate("test", "en", "ja"));

  return { line_info, line_id_to_code };
}

// Helper function to get station info for getInfo
async function getStationInfo({
  station_api_urls,
  line_info,
  line_id_to_code,
}) {
  // Get line station from all APIs
  const axios_promises = station_api_urls.map((url) => axios.get(url));
  const responses = await Promise.all(axios_promises);
  const response_station = responses.flatMap((response) => response.data);

  // Extracts needed info from response_station
  const station_info = await Promise.all(
    response_station.map(async (item) => {
      const extracted_data = {
        id: item["owl:sameAs"],
        geo: {
          lat: item[`geo:lat`],
          long: item[`geo:long`],
        },
        name: {
          en: item[`odpt:stationTitle`].en,
          ja: item[`odpt:stationTitle`].ja,
          ko: item[`odpt:stationTitle`].ko,
          "zh-Hans": item[`odpt:stationTitle`][`zh-Hans`],
          "zh-Hant": item[`odpt:stationTitle`][`zh-Hant`],
        },
        railways: item[`odpt:railway`],
      };

      return extracted_data;
    })
  );

  // Groups stations
  const grouped_stations = lodash.groupBy(station_info, "name.en");

  // Unpacks duplicate elements and unpacks the railways it is part of
  const unique_stations = Object.values(grouped_stations).map((group) => {
    const id = group[0].id.split(".").pop();

    return {
      id: id,
      name: group[0].name,
      railways: group.map((station) => {
        const railway_id = station.railways;

        // Manually fix Marunouchi Branch numbering
        let index = line_info
          .find((line) => line.id === railway_id)
          .stationOrder.find((item) => item.station === id).index;

        if (railway_id === "odpt.Railway:TokyoMetro.MarunouchiBranch") {
          if (id === "Honancho") {
            index = 3;
          } else if (id === "NakanoFujimicho") {
            index = 4;
          } else if (id === "NakanoShimbashi") {
            index = 5;
          } else if (id === "NakanoSakaue") {
            index = 6;
          }
        }

        return {
          id: railway_id,
          code: line_id_to_code.get(railway_id),
          index: index,
        };
      }),
      geo: group[0].geo,
      shown: true,
    };
  });

  // Create mapping of station id to coords
  station_to_coords = {};
  unique_stations.forEach((station) => {
    station_to_coords = {
      ...station_to_coords,
      [station.id]: [station.geo.lat, station.geo.long],
    };
  });

  return { unique_stations, station_to_coords };
}

// Helper function to cache needed translations
async function cacheTranslations(data, cache_file_path) {
  // Get already generated translations from cache
  const translations = fs.existsSync(cache_file_path)
    ? await readFromCache(cache_file_path)
    : {};

  // Checks if a translation is needed
  // I.e there is no name in the dataset and no name in cache
  function translationNeeded(item, language) {
    return (
      !item.name[language] &&
      !(translations[item.id] && translations[item.id][language])
    );
  }

  // Add translation
  async function addTranslation(item, language, api_language) {
    const translation = await translate(item.name.ja, "ja", api_language);

    if (!translations[item.id]) translations[item.id] = {};

    translations[item.id][language] = translation;
  }

  // Generate needed translations
  const promises = data.map(async (item) => {
    if (translationNeeded(item, "ko")) {
      await addTranslation(item, "ko", "ko");
    }

    if (translationNeeded(item, "zh-Hans")) {
      await addTranslation(item, "zh-Hans", "zh-cn");
    }

    if (translationNeeded(item, "zh-Hant")) {
      await addTranslation(item, "zh-Hant", "zh-tw");
    }
  });

  await Promise.all(promises);

  await writeToCache(translations, cache_file_path);
}

module.exports = { cacheMetroInfo };
