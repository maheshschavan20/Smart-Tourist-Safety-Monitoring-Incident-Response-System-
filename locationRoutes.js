const router = require("express").Router();
const Location = require("../models/Location");
const Group = require("../models/Group");
const User = require("../models/User");
const geoLib = require("geolib");

// 🔥 GET ALL LOCATIONS (IMPORTANT FIX)
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE LOCATION
router.post("/update", async (req, res) => {
  try {
    // 🟢 FIX: Extract groupId from req.body
    const { email, latitude, longitude, groupId } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "User not found" });

    // 🟢 FIX: Use findOneAndUpdate with correct upsert syntax
    await Location.findOneAndUpdate(
      { userId: user._id },
      { 
        latitude, 
        longitude, 
        username: user.username, 
        email: user.email, 
        updatedAt: new Date() 
      },
      { upsert: true, new: true }
    );

    // 🟢 FIX: Check Geofence if groupId is provided
    if (groupId) {
      const group = await Group.findById(groupId);
      if (group && group.centerLat) {
        const isInside = geoLib.isPointWithinRadius(
          { latitude, longitude },
          { latitude: group.centerLat, longitude: group.centerLng },
          group.safeRadius || 500
        );

        if (!isInside) {
          // Send real-time alert via Socket.io
          req.io.to(groupId).emit("AI_GEOFENCE_BREACH", {
            username: user.username,
            email: user.email,
            message: "🚨 GEOFENCE BREACH: Outside safe zone!"
          });
        }
      }
    }

    res.json({ message: "Location updated and safety checked" });
  } catch (err) {
    console.error("Location Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;