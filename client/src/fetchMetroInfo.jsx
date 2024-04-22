import axios from "axios";

async function fetchMetroInfo(url, setStations, setLines, setGeoHashmap, setFetchInfoError) {
  try {
    const response = await axios.get(`${url}/api/v1/metroInfo/getInfo`);

    // Set stations and lines
    setLines(response.data.lineInfo);
    setStations(response.data.stationInfo);
    setGeoHashmap(response.data.stationToCoords);

    setFetchInfoError("");
  } catch (err) {
    setFetchInfoError("Error fetching stations");
  }
}

export { fetchMetroInfo };
