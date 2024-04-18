const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const { CustomAPIError } = require("../errors/custom_error.js");

async function authMiddleware(req, res, next) {
    const auth_header = req.headers.authorization;

    if (!auth_header || !auth_header.startsWith("Bearer ")) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ err: "Authorization header missing" });
    }

    const token = auth_header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { acc_id, username } = decoded;
        req.user = { acc_id, username };
    } catch {
        next(new CustomAPIError("Not authorized to access this route", StatusCodes.UNAUTHORIZED));
    }

    next();
}

module.exports = authMiddleware;
