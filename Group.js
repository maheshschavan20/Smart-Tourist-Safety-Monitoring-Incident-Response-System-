const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: String,
  destination: String,
  startDate: String,
  endDate: String,
  maxMembers: Number,
  emails: [String],
  centerLat: { type: Number, default: 20.5937 }, 
  centerLng: { type: Number, default: 78.9629 },
  safeRadius: { type: Number, default: 5000 },

  tourists: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

module.exports = mongoose.model("Group", groupSchema);