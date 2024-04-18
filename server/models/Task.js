const mongoose = require("mongoose");
const Account = require("./Account.js");

const task_schema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            maxlength: 100,
            minlength: 1,
            trim: true,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        acc_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
    },
    { collection: "Tasks" }
);

task_schema.pre("findOneAndDelete", async function (next) {
    const task = await this.model.findOne(this.getQuery());
    try {
        await Account.findOneAndUpdate({ _id: task.acc_id }, { $pull: { tasks: task._id } });
        next();
    } catch (err) {
        return next(err);
    }
});

module.exports = mongoose.model("Task", task_schema);
