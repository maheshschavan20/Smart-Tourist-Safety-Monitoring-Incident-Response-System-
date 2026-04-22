const router = require("express").Router();
const mongoose = require("mongoose");
const Group = require("../models/Group");
const sendEmail = require("../utils/sendEmail");

// --- 🟢 POI MODEL DEFINITION ---
const POISchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  name: { type: String, required: true }, 
  category: { type: String, required: true }, 
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  addedBy: { type: String, default: "Admin" }
});

const POI = mongoose.models.POI || mongoose.model("POI", POISchema);

// =======================
// ➕ CREATE GROUP
// =======================
router.post("/create-group", async (req, res) => {
  try {
    const { name, destination, startDate, endDate, maxMembers, emails, centerLat, centerLng, safeRadius } = req.body;

    const group = new Group({
      name,
      destination,
      startDate: new Date(startDate), // 🟢 Saves exact ISO timestamp
      endDate: new Date(endDate),     // 🟢 Saves exact ISO timestamp
      maxMembers,
      emails: emails.map(e => e.toLowerCase()), // Normalize emails
      centerLat: parseFloat(centerLat) || 20.5937,
      centerLng: parseFloat(centerLng) || 78.9629,
      safeRadius: parseInt(safeRadius) || 500,
    });

    await group.save();

    const link = `${process.env.FRONTEND_URL}/join/${group._id}?email=`;
    await sendEmail(emails, link);

    res.json({ message: "Group created & emails sent", group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// 📂 GET ALL GROUPS (Time-Sensitive)
// =======================
router.get("/groups", async (req, res) => {
  try {
    // 🟢 Use exact current time to separate Active vs Inactive
    const now = new Date(); 
    const groups = await Group.find().populate("tourists");

    const active = groups.filter(g => new Date(g.endDate) > now);
    const inactive = groups.filter(g => new Date(g.endDate) <= now);

    res.json({ active, inactive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================================
// 📱 GET SINGLE GROUP (For Tourist & Admin Sync)
// ===========================================
router.get("/groups/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("tourists");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// ⚙️ UPDATE GROUP / SAFE ZONE / END DATE
// ===============================
router.put("/update-zone/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Sanitization
    if (updateData.centerLat) updateData.centerLat = parseFloat(updateData.centerLat);
    if (updateData.centerLng) updateData.centerLng = parseFloat(updateData.centerLng);
    if (updateData.safeRadius) updateData.safeRadius = parseInt(updateData.safeRadius);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("tourists");

    if (!updatedGroup) return res.status(404).json({ message: "Group not found" });
    
    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================================
// 📍 POI ROUTES (Admin Curated Locations)
// ===========================================
router.post("/add-poi", async (req, res) => {
  try {
    const { groupId, name, category, latitude, longitude } = req.body;
    
    const newPOI = new POI({
      groupId,
      name,
      category: category.toLowerCase(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    });
    
    await newPOI.save();
    res.status(201).json(newPOI);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/pois/:groupId", async (req, res) => {
  try {
    const pois = await POI.find({ groupId: req.params.groupId });
    res.json(pois);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch POIs" });
  }
});

module.exports = router;