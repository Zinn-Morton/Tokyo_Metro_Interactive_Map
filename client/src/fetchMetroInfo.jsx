import axios from "axios";

async function fetchMetroInfo(url, setStations, setLines, setGeoHashmap, setFetchInfoError) {
  try {
    const response = await axios.get(`${url}/api/v1/metroInfo/getInfo`);

    // Set stations and lines
    setStations(response.data.stationInfo);
    setLines(response.data.lineInfo);
    setGeoHashmap(response.data.stationToCoords);

    setFetchInfoError("");
  } catch (err) {
    setFetchInfoError("Error fetching stations");
  }
}

export { fetchMetroInfo };
