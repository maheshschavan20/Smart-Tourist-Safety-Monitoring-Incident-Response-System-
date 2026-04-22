const router = require("express").Router();
const Group = require("../models/Group");
const User = require("../models/User");

// Get groups for logged-in user
router.get("/my-groups/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const groups = await Group.find({
      tourists: user._id,
    });

    res.json(groups);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;