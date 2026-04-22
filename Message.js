const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  groupId: String,

  chatType: {
    type: String,
    enum: ["group", "quick"],
    default: "group",
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  senderName: String,
  text: String,

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);