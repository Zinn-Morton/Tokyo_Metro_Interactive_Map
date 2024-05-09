// Packages
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { getCoords } = require("./functions/getCoords.js");

// Metro info fetch
const { cacheMetroInfo } = require("./functions/cacheMetroInfo.js");

const app = express();

const port = 5000;

const url = process.env.FRONTEND_URL;

app.use(cors({ origin: url }));

// External files
const metroInfo = require("./routes/metroInfo.js");
const errorHandler = require("./middleware/error_handler.js");

// Middleware
app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "../client/dist")));

// Metro info router
app.use("/api/v1/metroInfo", metroInfo);

app.use(errorHandler);

// 404
app.all("*", (req, res) => {
  res.status(404).send("Resource not found");
});

async function start() {
  try {
    // Fetch metro info once then cache it if cache empty
    if (!fs.existsSync(process.env.METRO_INFO_CACHE_FILE_PATH))
      cacheMetroInfo();

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.log(`Could not connect to database. Error: ${err}`);
  }
}

start();
