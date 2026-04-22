const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");
const auth = require("../middleware/auth");

// SEND MESSAGE
router.post("/send", auth, async (req, res) => {
  try {
    const { groupId, text, chatType, receiverId } = req.body;

    let user = await User.findById(req.userId);

// 🔥 IF NOT USER → CHECK ADMIN
if (!user) {
  const Admin = require("../models/Admin");
  user = await Admin.findById(req.userId);
}

if (!user) {
  return res.status(400).json({ message: "User/Admin not found" });
}

    const msg = new Message({
      groupId,
      chatType,
      senderId: user._id,
      senderName: user.username || user.name || "Admin",// ✅ FIXED 
      receiverId: receiverId || null,
      text,
    });

    await msg.save();

    res.json({ message: "Message sent" });

  } catch (err) {
    console.log("Message error:", err);
    res.status(500).json({ message: "Error sending message" });
  }
});
// GET MESSAGES
router.get("/:groupId", async (req, res) => {
  try {
    const { chatType } = req.query;

    const msgs = await Message.find({
      groupId: req.params.groupId,
      chatType,
    }).sort({ createdAt: 1 });

    res.json(msgs);

  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});
module.exports = router;