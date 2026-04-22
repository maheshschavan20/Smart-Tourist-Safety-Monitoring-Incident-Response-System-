const router = require("express").Router();
const SOS = require("../models/SOS");
const User = require("../models/User");
const auth = require("../middleware/auth");

// 🚨 SEND SOS
router.post("/send", auth, async (req, res) => {
  try {
    const { latitude, longitude, groupId } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(400).json({ message: "User not found" });

    const sos = new SOS({
      email: user.email,
      username: user.username,
      latitude,
      longitude,
      groupId,
    });

    await sos.save();
    
    // 🟢 Notify the Admin Dashboard immediately
    req.io.to(groupId).emit("new_sos", sos);

    res.json({ message: "SOS sent successfully", sos });

    // Auto-delete SOS after 20 seconds to clear the map
    setTimeout(async () => {
      await SOS.findByIdAndDelete(sos._id);
    }, 20000);
  } catch (err) {
    res.status(500).json({ message: "Error sending SOS" });
  }
});
    
   // 🗑️ auto delete after 10 seconds
// GET SOS BY GROUP
router.get("/:groupId", async (req, res) => {
  try {
    const data = await SOS.find({
      groupId: req.params.groupId,
    }).sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching SOS" });
  }
});

// GET ALL SOS
router.get("/", async (req, res) => {
  try {
    // ⏱️ last 10 seconds only
    const last10Sec = new Date(Date.now() - 10 * 1000);

    const data = await SOS.find({
      createdAt: { $gte: last10Sec },
    }).sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {
    res.status(500).json({ message: "Error fetching SOS" });
  }
});

module.exports = router;