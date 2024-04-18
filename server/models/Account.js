const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const account_schema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            maxlength: 36,
            minlength: 1,
        },
        password: {
            type: String,
            required: true,
            trim: true,
        },
        tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    },
    { collection: "Accounts" }
);

account_schema.pre("save", async function (next) {
    const account = this;

    if (account.isModified("password") || account.isNew) {
        try {
            const hashed_password = await bcrypt.hash(account.password, 10);
            account.password = hashed_password;
            next();
        } catch (err) {
            next(err);
        }
    }
});

account_schema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Account", account_schema);
