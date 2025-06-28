const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const User = require("../models/user");

const client = new OAuth2Client("914537190439-7bvhvn8s9hbkt369cfq2cv8vvfkm59rh.apps.googleusercontent.com");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here_make_it_long_and_random";

// Test endpoint to verify server is working
router.get("/test", (req, res) => {
  res.json({ 
    message: "Auth server is working", 
    timestamp: new Date().toISOString(),
    googleClientId: "914537190439-7bvhvn8s9hbkt369cfq2cv8vvfkm59rh.apps.googleusercontent.com"
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ msg: "User already exists" });
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(password, salt);
    const newUser = new User({ name, email, password: hashedPwd });
    await newUser.save();
    res.status(201).json({ msg: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "Invalid email" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Invalid password" });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err });
  }
});

router.post("/google", async (req, res) => {
  const { credential } = req.body;
  
  console.log("Google OAuth request received");
  
  if (!credential) {
    console.error("No credential provided");
    return res.status(400).json({ msg: "No credential provided" });
  }
  
  try {
    console.log("Verifying Google ID token...");
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: "914537190439-7bvhvn8s9hbkt369cfq2cv8vvfkm59rh.apps.googleusercontent.com"
    });

    const payload = ticket.getPayload();
    console.log("Google payload received:", { 
      email: payload.email, 
      name: payload.name,
      sub: payload.sub 
    });
    
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });
    console.log("User lookup result:", user ? "User found" : "User not found");
    
    if (!user) {
      // Create new user if doesn't exist
      console.log("Creating new Google user...");
      user = new User({
        name,
        email,
        googleId: payload.sub,
        profilePicture: picture,
        isGoogleUser: true
      });
      await user.save();
      console.log("New Google user created:", user._id);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("JWT token generated successfully");

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      msg: "Google authentication failed", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;