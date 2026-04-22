const router = require("express").Router();
const User = require("../models/User");
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const verifyBlockchainID = require("../utils/blockchainVerify");

// =======================
// TOURIST SIGNUP
// ======================

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    // 🛡️ AUTOMATIC BLOCKCHAIN VERIFICATION
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
      const abi = ["function addIdentity(bytes32 _idHash) public"];
      const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

      const idHash = ethers.id(email.toLowerCase());
      
      // Attempt to send transaction
      const tx = await contract.addIdentity(idHash);
      console.log(`⛓️  Auto-Verifying ${email} on Blockchain... TX: ${tx.hash}`);
      
    } catch (blockchainErr) {
      // 🟢 LOG ERROR BUT DON'T STOP SIGNUP
      console.error("❌ Blockchain Registration Error (Likely Gas/Funds):", blockchainErr.message);
    }

    res.json({ message: "Signup successful! Safety features pending activation." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// TOURIST LOGIN
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 🛡️ BLOCKCHAIN IDENTITY CHECK (Safe Execution)
    let isVerified = false;
    try {
        isVerified = await verifyBlockchainID(email);
    } catch (err) {
        console.log("🛡️ Blockchain Status Check Bypassed:", err.message);
    }

    // 🖥️ TERMINAL LOGGING
    console.log("-----------------------------------");
    console.log(`👤 Login Attempt: ${email}`);
    console.log(`🛡️  Blockchain Status: ${isVerified ? "VERIFIED ✅" : "UNVERIFIED ⚪ (Gas Required)"}`);
    console.log("-----------------------------------");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // 🟢 ALWAYS return the token so login succeeds even if unverified
    res.json({ 
      token, 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        blockchainVerified: isVerified 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// ADMIN SIGNUP
// =======================
router.post("/admin/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ email: email.toLowerCase(), password: hashedPassword });
    await admin.save();

    res.json({ message: "Admin signup successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// ADMIN LOGIN
// =======================
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
    
    // 🟢 Ensuring consistent object structure for Admin Web
    res.json({ 
        token, 
        admin: {
            _id: admin._id,
            email: admin.email
        } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;