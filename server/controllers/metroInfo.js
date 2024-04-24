const axios = require("axios");
const lodash = require("lodash");

const { StatusCodes } = require("http-status-codes");
const asyncWrapper = require("../middleware/async.js");

// Returns these 3 things:

// Gets all unique stations
// Returns id, geocoords, name in multiple languages, which lines it connects to, and line codes for the lines it connects to

// Gets all lines
// Returns id, name in multiple languages, color, code, and station order

// Returns a object mapping station id to coords
const getInfo = asyncWrapper(async (req, res) => {
  // From https://ckan.odpt.org/en/dataset/r_route-tokyometro/resource/81d953eb-65f8-4dfd-ba99-cd43d41e8b9b
  const response_line = await axios.get(
    `https://api.odpt.org/api/v4/odpt:Railway?odpt:operator=odpt.Operator:TokyoMetro&acl:consumerKey=${process.env.ODPT_TOKEN}`
  );

  // Hashmap for line id to code
  const line_id_to_code = new Map();

  // Extracts needed info from response_line
  const line_info = response_line.data.map((item) => {
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

    line_id_to_code.set(extracted_data.id, extracted_data.code);

    return extracted_data;
  });

  // From https://ckan.odpt.org/en/dataset/r_station-tokyometro/resource/9a17b58f-9258-431b-a006-add6eb0cacc6
  const response_station = await axios.get(
    `https://api.odpt.org/api/v4/odpt:Station?odpt:operator=odpt.Operator:TokyoMetro&acl:consumerKey=${process.env.ODPT_TOKEN}`
  );

  // Extracts needed info from response_station
  const station_info = response_station.data.map((item) => {
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
        "ja-Hrkt": item[`odpt:stationTitle`]["ja-Hrkt"],
        "zh-Hans": item[`odpt:stationTitle`][`zh-Hans`],
        "zh-Hant": item[`odpt:stationTitle`][`zh-Hant`],
      },
      railways: item[`odpt:railway`],
    };

    return extracted_data;
  });

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

        return {
          id: railway_id,
          code: line_id_to_code.get(railway_id),
          index: line_info.find((line) => line.id === railway_id).stationOrder.find((item) => item.station === id).index,
        };
      }),
      geo: group[0].geo,
      shown: true,
    };
  });

  // Create mapping of station id to coords
  station_to_coords = {};
  unique_stations.forEach((station) => {
    station_to_coords = { ...station_to_coords, [station.id]: [station.geo.lat, station.geo.long] };
  });

  const ret = {
    stationInfo: unique_stations,
    lineInfo: line_info,
    stationToCoords: station_to_coords,
  };

  res.status(StatusCodes.OK).json(ret);
});

module.exports = { getInfo };
