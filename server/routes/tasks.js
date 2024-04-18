const express = require("express");

const { signup, login, getUsersTasks, createTask, deleteTask, editTask } = require("../controllers/tasks.js");
const authMiddleware = require("../middleware/auth.js");

const router = express.Router();

// Base path: /api/v1/tasks
router.post("/signup", signup);
router.post("/login", login);
router.get("/", authMiddleware, getUsersTasks);
router.post("/", authMiddleware, createTask);
router.delete("/:id", authMiddleware, deleteTask);
router.patch("/:id", authMiddleware, editTask);

module.exports = router;
