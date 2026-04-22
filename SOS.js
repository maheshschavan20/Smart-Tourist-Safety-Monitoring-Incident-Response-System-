const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema({
  email: String,
  username: String,
  latitude: Number,
  longitude: Number,

  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SOS", sosSchema);