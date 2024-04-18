// Packages
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();


const port = 5000;

const url = "http://localhost:5173";
// const url = "https://task-manager-self.fly.dev";

app.use(cors({ origin: url }));

// External files
const connectDB = require("./db/connect.js");
const fare = require("./routes/fare.js");
const errorHandler = require("./middleware/error_handler.js");

// Middleware
app.use(express.json());

// Frontend
// app.use(express.static("./public"));

// Tasks router
app.use("/api/v1/fare", fare);

app.use(errorHandler);

// 404
app.all("*", (req, res) => {
    res.status(404).send("Resource not found");
});

async function start() {
    try {
        // Temporarily disabled DB
        // await connectDB(process.env.MONGO_URI);

        // console.log("Connected to database");

        app.listen(port, "0.0.0.0", () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (err) {
        console.log(`Could not connect to database. Error: ${err}`);
    }
}

start();
