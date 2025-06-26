const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");


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
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
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
module.exports = router;