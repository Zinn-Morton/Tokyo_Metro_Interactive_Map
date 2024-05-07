const fs = require("fs");

// Read
async function readFromCache(cache_file_path) {
  try {
    const data = await fs.promises.readFile(cache_file_path, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading from cache:", err);
    return null;
  }
}

// Write
async function writeToCache(data, cache_file_path) {
  try {
    await fs.promises.writeFile(cache_file_path, JSON.stringify(data));
  } catch (err) {
    console.error("Error writing to cache: ", err);
  }
}

module.exports = { readFromCache, writeToCache };
