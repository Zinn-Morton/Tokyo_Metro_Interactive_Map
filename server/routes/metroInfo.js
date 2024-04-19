const express = require("express");

const { getInfo } = require("../controllers/metroInfo.js");
const authMiddleware = require("../middleware/auth.js");

const router = express.Router();

// Base path: /api/v1/fare
router.get("/getInfo", getInfo);

// Remnant from Task Manager - kept for reference
// router.post("/signup", signup);
// router.post("/login", login);
// router.get("/", authMiddleware, getUsersTasks);
// router.post("/", authMiddleware, createTask);
// router.delete("/:id", authMiddleware, deleteTask);
// router.patch("/:id", authMiddleware, editTask);

module.exports = router;
