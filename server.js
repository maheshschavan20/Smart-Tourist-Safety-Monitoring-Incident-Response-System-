const express = require("express");
const http = require("http"); // Required for Socket.io
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const server = http.createServer(app); // Wrap express app
const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with your frontend URLs
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// 💡 PASS IO TO ROUTES
// This allows your SOS and Location routes to send real-time alerts
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/join", require("./routes/joinRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/location", require("./routes/locationRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/sos", require("./routes/sosRoutes"));

// Socket.io Connection Logic
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join_group", (groupId) => {
    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected");
  });
});

// Connect MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Smart Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.log(err));