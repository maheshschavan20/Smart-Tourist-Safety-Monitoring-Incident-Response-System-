const router = require("express").Router();
const Group = require("../models/Group");
const User = require("../models/User");

// Join group AFTER login
router.post("/:groupId", async (req, res) => {
  try {
    const { email } = req.body;
    const { groupId } = req.params;

   const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "User not found" });

    const group = await Group.findById(groupId);

    // ✅ CHECK: email must be invited
   if (!group.emails.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
  return res.status(403).json({ message: "You are not invited to this group" });
}

    // ✅ Add user if not already added
   if (!group.tourists.some(id => id.toString() === user._id.toString())) {
  group.tourists.push(user._id);
  await group.save();
}

    res.json({ message: "Joined group successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;