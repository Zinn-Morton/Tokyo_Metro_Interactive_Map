const { CustomAPIError } = require("../errors/custom_error.js");

function errorHandlerMiddleware(err, req, res, next) {
    console.log(err.message);
    if (err instanceof CustomAPIError) {
        console.log(err.status_code);
        return res.status(err.status_code).json({ err: err.message });
    } else {
        console.log(500);
        return res.status(500).json({ err: err.message });
    }
}

module.exports = errorHandlerMiddleware;
