// Language list
const { getLanguageList } = require("./getLanguageList.js");

// Station stuff

// Function to get station info from id
function getStationFromId(stationInfo, id) {
  return stationInfo.find((station) => station.id === id);
}

// Function to get station info from name
// Handles casing differences
function getStationFromName(stationInfo, name) {
  const language_list = getLanguageList();

  for (station of stationInfo) {
    for (const language of language_list) {
      if (station.name[language].toLowerCase() === name.toLowerCase())
        return station;
    }
  }

  return null;
}

// Function to get a station's index on a line
function getStationIndexOnLine(stationInfo, station_id, line_id) {
  const station = getStationFromId(stationInfo, station_id);

  return station.railways.find(({ id }) => id === line_id).index;
}

// Line stuff

// Function to get line info from id
function getLineFromId(lineInfo, id) {
  return lineInfo.find((line) => line.id === id);
}

// Gets start station on a line
function getLineStartStation({ stationInfo, lineInfo }, line_id) {
  const line = getLineFromId(lineInfo, line_id);

  return getStationFromId(stationInfo, line.stationOrder[0].station);
}

// Gets end station on a line
function getLineEndStation({ stationInfo, lineInfo }, line_id) {
  const line = getLineFromId(lineInfo, line_id);

  return getStationFromId(
    stationInfo,
    line.stationOrder[line.stationOrder.length - 1].station
  );
}

// Get travel direction from one station to another
// For example - Otemachi -> Kasai via Tozai line = Towards Nishi-Funabashi
function getDirectionStation(
  { stationInfo, lineInfo },
  line_id,
  station_id1,
  station_id2
) {
  // Get start and end station of line
  const line_start = getLineStartStation({ stationInfo, lineInfo }, line_id);
  const line_end = getLineEndStation({ stationInfo, lineInfo }, line_id);

  // Get indices of each station on the line
  const ind1 = getStationIndexOnLine(stationInfo, station_id1, line_id);
  const ind2 = getStationIndexOnLine(stationInfo, station_id2, line_id);

  // Return based on comparison of indices
  return ind1 < ind2 ? line_end : line_start;
}

module.exports = { getStationFromName, getDirectionStation, getStationFromId };
