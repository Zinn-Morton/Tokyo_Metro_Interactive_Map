// Basic stuff
import { useContext } from "react";

// Contexts
import { MetroContext } from "../Contexts.jsx";

// Get station name in a language from the id
function getStationFromId(id) {
  const { stations } = useContext(MetroContext);

  return stations.find((station) => station.id === id);
}

// Get line name in a language from the id
function getLineFromId(id) {
  const { lines } = useContext(MetroContext);

  return lines.find((line) => line.id === id);
}

// Gets the index a station is on a particular line
function getStationIndexOnLine(station_id, line_id) {
  const station = getStationFromId(station_id);
  const railways = station.railways;

  const railway = railways.find((railway) => railway.id === line_id);
  return railway.index;
}

export { getStationFromId, getLineFromId, getStationIndexOnLine };
