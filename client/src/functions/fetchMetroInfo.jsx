import axios from "axios";

async function fetchMetroInfo({
  BACKEND_URL,
  setStations,
  setLines,
  setGeoHashmap,
  setOperators,
  setFetchInfoError,
  clearRetryInterval,
  setOperatorIdToName,
}) {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/metroInfo/getInfo`);

    // Set all states
    setLines(response.data.lineInfo);
    setStations(response.data.stationInfo);
    setGeoHashmap(response.data.stationToCoords);
    setOperators(response.data.operators);
    setOperatorIdToName(response.data.operatorIdToName);

    setFetchInfoError("");

    if (clearRetryInterval) clearRetryInterval();

    return true;
  } catch (err) {
    console.log(err);
    setFetchInfoError("Error Fetching Metro Info");

    return false;
  }
}

export { fetchMetroInfo };
