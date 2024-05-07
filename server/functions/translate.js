const axios = require("axios");
const rateLimit = require("axios-rate-limit");

// Helper function for text translation
async function translate(text, source, target) {
  console.log("Translation API used");

  const encodedParams = new URLSearchParams();
  encodedParams.set("from", source);
  encodedParams.set("to", target);
  encodedParams.set("text", text);

  const options = {
    method: "POST",
    url: "https://google-translate113.p.rapidapi.com/api/v1/translator/text",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "X-RapidAPI-Key": process.env.TRANSLATE_TOKEN,
      "X-RapidAPI-Host": "google-translate113.p.rapidapi.com",
    },
    data: encodedParams,
  };

  const response = await axiosInstance.request(options);

  return response.data.trans;
}

// Rate limiting
const axiosInstance = rateLimit(axios.create(), {
  maxRequests: 5, // Maximum number of requests
  perMilliseconds: 1000, // Time interval in milliseconds
});

module.exports = { translate };
