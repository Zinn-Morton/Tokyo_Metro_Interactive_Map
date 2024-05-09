const axios = require("axios");
const Bottleneck = require("bottleneck");

// Rate limiting
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000,
});

// Helper function for text translation
async function getCoords(station_name) {
  async function apiSearch(search) {
    const headers = {
      Referer: "https://tokyo-metro-interactive-map.fly.dev/",
      "User-Agent": "Tokyo-Metro-Interactive-Map/1.0",
    };

    const response = await limiter.schedule(() =>
      axios.get(
        `https://nominatim.openstreetmap.org/search?q=${search}&format=json`,
        { headers }
      )
    );

    console.log(`Nominatim API Used: text = ${search}`);

    return response;
  }

  // Try english then japanese
  let response = await apiSearch(station_name.en + " Station, Japan");

  if (!response.data[0])
    response = await apiSearch(station_name.ja + "駅, 日本");

  // If still no result just give center of map for now
  if (!response.data[0]) {
    return {
      lat: 35.71,
      long: 139.75,
    };
  }

  return {
    lat: parseFloat(response.data[0].lat),
    long: parseFloat(response.data[0].lon),
  };
}

module.exports = { getCoords };
