const fs = require("fs");
const path = require("path");
const axios = require("axios");
const lodash = require("lodash");

// Cache
const { readFromCache, writeToCache } = require("../cache/cacheFuncs.js");

// Translate API
const { translate } = require("../functions/translate.js");

// Coords API
const { getCoords } = require("../functions/getCoords.js");

// Lines to include. Since I'm using the full dataset some of them don't work
const included_line_ids = new Set([
  "odpt.Railway:TWR.Rinkai",
  "odpt.Railway:TokyoMetro.Fukutoshin",
  "odpt.Railway:Toei.Arakawa",
  "odpt.Railway:Toei.Asakusa",
  "odpt.Railway:Yurikamome.Yurikamome",
  "odpt.Railway:TokyoMetro.Namboku",
  "odpt.Railway:TokyoMetro.Chiyoda",
  "odpt.Railway:Toei.NipporiToneri",
  "odpt.Railway:Toei.Oedo",
  "odpt.Railway:TokyoMetro.Ginza",
  "odpt.Railway:TokyoMetro.Hanzomon",
  "odpt.Railway:TokyoMetro.Hibiya",
  "odpt.Railway:TokyoMetro.MarunouchiBranch",
  "odpt.Railway:TokyoMetro.Marunouchi",
  "odpt.Railway:TokyoMetro.Tozai",
  "odpt.Railway:TokyoMetro.Yurakucho",
  "odpt.Railway:Toei.Mita",
  "odpt.Railway:Toei.Shinjuku",
  "odpt.Railway:JR-East.Yamanote",
]);

// Caches these things:

// Gets all unique stations
// Caches id, geocoords, name in multiple languages, which lines it connects to, and line codes for the lines it connects to

// Gets all lines
// Caches id, name in multiple languages, color, code, and station order

// Caches a object mapping station id to coords

// For all stations/lines without a chinese or korean name, caches generated translations
async function cacheMetroInfo() {
  // Get info about lines
  const line_api_urls = [
    `https://api.odpt.org/api/v4/odpt:Railway?acl:consumerKey=${process.env.ODPT_TOKEN}`,
  ];

  let { line_info, line_id_to_code } = await getLineInfo(line_api_urls);

  // Get info about stations
  const station_api_urls = [
    `https://api.odpt.org/api/v4/odpt:Station?acl:consumerKey=${process.env.ODPT_TOKEN}`,
  ];

  let unique_stations = await getStationInfo({
    station_api_urls,
    line_info,
    line_id_to_code,
  });

  console.log("Fetched line and station info");

  // Generate and cache machine translations for stations/lines without a korean/chinese name
  const [station_translate_info, line_translate_info] =
    await generateAndCacheAllTranslations(unique_stations, line_info);

  // Embed translations into unique_stations and line_info
  embedAllTranslations(
    { unique_stations, station_translate_info },
    { line_info, line_translate_info }
  );

  // Generate and cache coordinates for stations
  const generated_coords = await generateAndCacheCoords(unique_stations);

  // Embed geo coords into metro_info
  embedCoords(unique_stations, generated_coords);

  // Create mapping of station id to coords
  const station_to_coords = mapStationToCoords(unique_stations, {});

  // Get list of operators
  const operators = getAllOperators(line_info);

  // Build adjacency list of stations
  const adj_list = buildAdjList(line_info, station_to_coords);

  // Package for metro info cache
  const ret = {
    stationInfo: unique_stations,
    lineInfo: line_info,
    stationToCoords: station_to_coords,
    operators: operators,
    adjList: adj_list,
  };

  await writeToCache(ret, process.env.METRO_INFO_CACHE_FILE_PATH);

  console.log("Done fetching, generating, and caching all info");
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
  let line_info = response_line.map((item) => {
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
      code: item["odpt:lineCode"] || "no-code",
      operator: item["odpt:operator"].split(":").pop(),
      stationOrder: item["odpt:stationOrder"].map((station) => {
        return {
          index: station["odpt:index"],
          station: station["odpt:station"].split(".").pop(),
        };
      }),
      shown: true,
    };

    // Adds manually created missing data
    addMissingLineData(extracted_data);

    line_id_to_code.set(extracted_data.id, extracted_data.code);

    return extracted_data;
  });

  // Filter only stations in included lines
  line_info = line_info.filter((line) => {
    return included_line_ids.has(line.id);
  });

  return { line_info, line_id_to_code };
}

// Helper function to add manually created data to lines
function addMissingLineData(extracted_data) {
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

  // Fix Yamanote code and line order
  if (extracted_data.id === "odpt.Railway:JR-East.Yamanote") {
    extracted_data.code = "JY";

    extracted_data.color = "#9acd32";

    yamanote_order = [
      "Tokyo",
      "Kanda",
      "Akihabara",
      "Okachimachi",
      "Ueno",
      "Uguisudani",
      "Nippori",
      "NishiNippori",
      "Tabata",
      "Komagome",
      "Sugamo",
      "Otsuka",
      "Ikebukuro",
      "Mejiro",
      "Takadanobaba",
      "ShinOkubo",
      "Shinjuku",
      "Yoyogi",
      "Harajuku",
      "Shibuya",
      "Ebisu",
      "Meguro",
      "Gotanda",
      "Osaki",
      "Shinagawa",
      "TakanawaGateway",
      "Tamachi",
      "Hamamatsucho",
      "Shimbashi",
      "Yurakucho",
      "Tokyo",
    ];

    extracted_data.stationOrder = yamanote_order.map((station, index) => {
      return { index: index + 1, station: station };
    });
  }
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
        railway: item[`odpt:railway`],
      };

      return extracted_data;
    })
  );

  // Filter only stations in included lines
  const filtered_stations = station_info.filter((station) => {
    return included_line_ids.has(station.railway);
  });

  // Groups stations
  const grouped_stations = lodash.groupBy(filtered_stations, "name.en");

  // Unpacks duplicate elements and unpacks the railways it is part of
  let unique_stations = Object.values(grouped_stations).map((group) => {
    const id = group[0].id.split(".").pop();

    let name = {};
    group.forEach((station) => {
      Object.entries(station.name).forEach(([language, l_name]) => {
        if (l_name) name[language] = l_name;
      });
    });

    let geo = {};
    group.forEach((station) => {
      if (station.geo.lat) {
        geo.lat = station.geo.lat;
      }

      if (station.geo.long) {
        geo.long = station.geo.long;
      }
    });

    return {
      id: id,
      name: name,
      railways: group.map((station) => {
        const railway_id = station.railway;

        // Manually fix Marunouchi Branch numbering
        let index = line_info
          .find((line) => line.id === railway_id)
          .stationOrder.find((item) => item.station === id)?.index;

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
      geo: geo,
      shown: true,
    };
  });

  // Adds manually created stations
  unique_stations = addMissingStations(unique_stations, line_id_to_code);

  return unique_stations;
}

// Helper function to add manually created stations
function addMissingStations(unique_stations, line_id_to_code) {
  return [
    ...unique_stations,
    {
      id: "Uguisudani",
      name: {
        en: "Uguisudani",
        ja: "鶯谷",
      },
      railways: [
        {
          id: "odpt.Railway:JR-East.Yamanote",
          code: line_id_to_code.get("odpt.Railway:JR-East.Yamanote"),
          index: 6,
        },
      ],
      geo: {},
      shown: true,
    },
    {
      id: "Tabata",
      name: {
        en: "Tabata",
        ja: "田端",
      },
      railways: [
        {
          id: "odpt.Railway:JR-East.Yamanote",
          code: line_id_to_code.get("odpt.Railway:JR-East.Yamanote"),
          index: 9,
        },
      ],
      geo: {},
      shown: true,
    },
    {
      id: "Mejiro",
      name: {
        en: "Mejiro",
        ja: "目白",
      },
      railways: [
        {
          id: "odpt.Railway:JR-East.Yamanote",
          code: line_id_to_code.get("odpt.Railway:JR-East.Yamanote"),
          index: 14,
        },
      ],
      geo: {},
      shown: true,
    },
    {
      id: "ShinOkubo",
      name: {
        en: "ShinOkubo",
        ja: "新大久保",
      },
      railways: [
        {
          id: "odpt.Railway:JR-East.Yamanote",
          code: line_id_to_code.get("odpt.Railway:JR-East.Yamanote"),
          index: 16,
        },
      ],
      geo: {},
      shown: true,
    },
    {
      id: "Shinagawa",
      name: {
        en: "Shinagawa",
        ja: "品川",
      },
      railways: [
        {
          id: "odpt.Railway:JR-East.Yamanote",
          code: line_id_to_code.get("odpt.Railway:JR-East.Yamanote"),
          index: 25,
        },
      ],
      geo: {},
      shown: true,
    },
  ];
}

// Helper function to cache needed translations. Called by generateAndCacheAllTranslations
async function generateAndCacheTranslations(data, cache_file_path) {
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

  // Add translation to cache
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

  console.log("Done With Translate API");

  await writeToCache(translations, cache_file_path);

  return translations;
}

// Helper function to generate and cache needed station and railway translations
async function generateAndCacheAllTranslations(unique_stations, line_info) {
  let station_translate_info = await generateAndCacheTranslations(
    unique_stations,
    process.env.STATION_TRANSLATE_CACHE_FILE_PATH
  );

  let line_translate_info = await generateAndCacheTranslations(
    line_info,
    process.env.LINE_TRANSLATE_CACHE_FILE_PATH
  );

  // Add machine learning translate notice (not cached, just for return)
  // Not using for now
  function markMLTranslate(translations) {
    for (let translation in translations) {
      translations[translation]["ko"] += " [기계 번역]";
      translations[translation]["zh-Hans"] += " [机器翻译]";
      translations[translation]["zh-Hant"] += " [機器翻譯]";
    }
  }

  // markMLTranslate(station_translate_info);
  // markMLTranslate(line_translate_info);

  return [station_translate_info, line_translate_info];
}

// Helper function to embed translations into unique_stations and line_info where needed
function embedAllTranslations(
  { unique_stations, station_translate_info },
  { line_info, line_translate_info }
) {
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

  embedTranslations(unique_stations, station_translate_info);
  embedTranslations(line_info, line_translate_info);
}

// Helper function to generate cache needed geo coords for stations
async function generateAndCacheCoords(stations) {
  const cache_file_path = process.env.STATION_COORDS_CACHE_FILE_PATH;

  // Get already generated coordinates from cache
  const coords = fs.existsSync(cache_file_path)
    ? await readFromCache(cache_file_path)
    : {};

  // Checks if coordinates are needed
  // I.e there are no coords in the dataset and no coords in cache
  function coordsNeeded(station) {
    return !(station?.geo?.lat && station?.geo?.long) && !coords[station.id];
  }

  // Add coords to cache
  async function addCoords(station) {
    coords[station.id] = await getCoords(station.name);
  }

  // Generate needed coords
  const promises = stations.map(async (station) => {
    if (coordsNeeded(station)) {
      await addCoords(station);
    }
  });

  await Promise.all(promises);

  console.log("Done With Nominatim API");

  await writeToCache(coords, cache_file_path);

  return coords;
}

// Helper function to embed coords into unique_stations
function embedCoords(unique_stations, generated_coords) {
  unique_stations = unique_stations.map((station) => {
    if (!(station?.geo?.lat && station?.geo?.long)) {
      station.geo = generated_coords[station.id];
    }

    return station;
  });
}

// Helper function to map stations to their coords
function mapStationToCoords(unique_stations, generated_coords) {
  let station_to_coords = {};

  function addToMap(station_id, lat, long) {
    station_to_coords = {
      ...station_to_coords,
      [station_id]: [lat, long],
    };
  }

  unique_stations.forEach((station) => {
    if (station.geo && station.geo.lat && station.geo.long) {
      addToMap(station.id, station.geo.lat, station.geo.long);
    }
  });

  Object.keys(generated_coords).forEach((station_id) => {
    const { lat, long } = generated_coords[station_id];

    addToMap(station_id, lat, long);
  });

  return station_to_coords;
}

// Helper function to collect all operators from lines
// Sorts operators depending on how many lines they have
function getAllOperators(line_info) {
  // Count
  const operator_counts = {};
  line_info.forEach((line) => {
    const operator = line.operator;
    operator_counts[operator] = (operator_counts[operator] || 0) + 1;
  });

  // Sort
  const sorted_operators = Object.keys(operator_counts).sort(
    (a, b) => operator_counts[b] - operator_counts[a]
  );

  return sorted_operators;
}

// Helper function to bulid adjacency list of stations
function buildAdjList(line_info, station_to_coords) {
  const adj_list = {};

  // Function to get distance between two stations
  function getStationDistance(station_id1, station_id2) {
    // Found here https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
    function getDistanceFromLatLonInKm([lat1, lon1], [lat2, lon2]) {
      function deg2rad(deg) {
        return deg * (Math.PI / 180);
      }

      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2 - lat1); // deg2rad below
      var dLon = deg2rad(lon2 - lon1);
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c; // Distance in km
      return d;
    }

    return getDistanceFromLatLonInKm(
      station_to_coords[station_id1],
      station_to_coords[station_id2]
    );
  }

  // Function to add to adjacency list
  function addToAdjList(cur_station_id, connecting_station_id, line_id) {
    // Initialize adj_list[cur_station_id] if not already initialized
    if (!adj_list[cur_station_id]) {
      adj_list[cur.station] = {};
    }

    // Get distance between the two stations

    // Initialize adj_list[cur_station_id][connecting_station_id] if not already initialized
    adj_list[cur_station_id][connecting_station_id] = adj_list[cur_station_id][
      connecting_station_id
    ] || {
      distance: getStationDistance(cur_station_id, connecting_station_id),
      connectingLines: [],
    };

    // Add connection
    adj_list[cur_station_id][connecting_station_id].connectingLines.push(
      line_id
    );
  }

  // Build adjacencies for each line
  line_info.forEach((line) => {
    const station_order = line.stationOrder;

    for (let i = 0; i < station_order.length; i++) {
      // Get cur, previous, and next
      const cur = station_order[i];
      const prev = i > 0 ? station_order[i - 1] : null;
      const next = i < station_order.length - 1 ? station_order[i + 1] : null;

      // Initialize adj_list[cur.station] if not already initialized
      if (!adj_list[cur.station]) {
        adj_list[cur.station] = {};
      }

      if (prev) addToAdjList(cur.station, prev.station, line.id);

      if (next) addToAdjList(cur.station, next.station, line.id);
    }
  });

  return adj_list;
}

module.exports = { cacheMetroInfo };
