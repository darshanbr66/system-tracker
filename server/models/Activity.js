const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  user: String,
  app: String,
  activity: String,
  title: String,
  idleTimeMs: Number,
  idleTimeSec: Number,
  inputType: String,
  status: String,
  timestamp: Date,
  screenshot: String
});

module.exports = mongoose.model("Activity", activitySchema);