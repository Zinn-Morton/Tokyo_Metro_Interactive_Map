import axios from "axios";

async function fetchMetroInfo({
  url,
  setStations,
  setLines,
  setGeoHashmap,
  setOperators,
  setFetchInfoError,
  timerId,
}) {
  try {
    const response = await axios.get(`${url}/api/v1/metroInfo/getInfo`);

    // Set all states
    setLines(response.data.lineInfo);
    setStations(response.data.stationInfo);
    setGeoHashmap(response.data.stationToCoords);
    setOperators(response.data.operators);

    setFetchInfoError("");

    if (timerId) clearInterval(timerId);

    return true;
  } catch (err) {
    setFetchInfoError("Error Fetching Metro Info");

    return false;
  }
}

export { fetchMetroInfo };
