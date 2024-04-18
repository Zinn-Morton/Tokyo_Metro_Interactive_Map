class CustomAPIError extends Error {
    constructor(message, status_code) {
        super(message);
        this.status_code = status_code;
    }
}

function createCustomError(msg, status_code) {
    return new CustomAPIError(msg, status_code);
}

module.exports = { createCustomError, CustomAPIError };
