const axios = require("axios");
const Bottleneck = require("bottleneck");

// Rate limiting
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 50,
});

// Helper function for text translation
async function translate(text, source, target) {
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

  const response = await limiter.schedule(() => axios.request(options));

  console.log("Translate API Used: text = " + text + ", target = " + target);

  return response.data.trans;
}

module.exports = { translate };
