const mongoose = require("mongoose");

const POISchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  name: { type: String, required: true }, // e.g., "Recommended Clinic"
  category: { type: String, required: true }, // e.g., "hospital"
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  addedBy: { type: String, default: "Admin" }
});

module.exports = mongoose.model("POI", POISchema);