const axios = require("axios");
const jwt = require("jsonwebtoken");
const lodash = require("lodash");

const Task = require("../models/Task.js");
const Account = require("../models/Account.js");
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
    const extracted_data = {
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
    };

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
          name: railway_id.split(".").pop(),
          code: line_id_to_code.get(railway_id),
          index: line_info.find((line) => line.id === railway_id).stationOrder.find((item) => item.station === id).index,
        };
      }),
      geo: group[0].geo,
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

// EVERYTHING BELOW IS A REMNANT LEFT FOR REFERENCE

// Signup - Create account and send jwt
const signup = asyncWrapper(async (req, res) => {
  const new_acc = await Account.create(req.body);

  const token = jwt.sign({ acc_id: new_acc._id, username: new_acc.username }, process.env.JWT_SECRET, { expiresIn: "30d" });

  res.status(StatusCodes.OK).json({ token: token });
});

// Log into account and send jwt
const login = asyncWrapper(async (req, res) => {
  const { username, password } = req.body;

  const acc = await Account.findOne({ username: username });

  if (!acc) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }

  const password_correct = await acc.comparePassword(password);

  if (password_correct) {
    const token = jwt.sign({ acc_id: acc._id, username: acc.username }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.status(StatusCodes.OK).json({ token: token });
  } else {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }
});

// Get tasks for a particular user
const getUsersTasks = asyncWrapper(async (req, res) => {
  const acc = await Account.findOne({ _id: req.user.acc_id });
  const all_tasks = await Task.find({ _id: { $in: acc.tasks } });
  res.status(StatusCodes.OK).json(all_tasks);
});

// Create a task and attach it to a user
const createTask = asyncWrapper(async (req, res) => {
  const acc = await Account.findOne({ _id: req.user.acc_id });
  const new_task = await Task.create({ ...req.body, acc_id: acc._id });
  await Account.findByIdAndUpdate(req.user.acc_id, {
    $push: { tasks: new_task._id },
  });
  res.status(StatusCodes.OK).json(new_task);
});

// Delete a task (only if the user owns the task)
const deleteTask = asyncWrapper(async (req, res) => {
  const acc = await Account.findOne({ _id: req.user.acc_id });

  const { id } = req.params;

  if (!acc.tasks.includes(id)) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ err: "Cannot delete another user's task" });
  }

  const deleted_task = await Task.findOneAndDelete({ _id: id });

  if (!deleted_task) {
    return res.status(StatusCodes.NOT_FOUND).json({ err: `Task not found` });
  }

  res.status(StatusCodes.OK).json(deleted_task);
});

// Edit a task (only if the user owns the task)
const editTask = asyncWrapper(async (req, res) => {
  const acc = await Account.findOne({ _id: req.user.acc_id });

  const { id } = req.params;

  if (!acc.tasks.includes(id)) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ err: "Cannot edit another user's task" });
  }

  const edited_task = await Task.findOneAndUpdate({ _id: id }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!edited_task) {
    return res.status(StatusCodes.NOT_FOUND).json({ err: "Task not found" });
  }

  res.status(StatusCodes.OK).json(edited_task);
});

module.exports = { getInfo };
