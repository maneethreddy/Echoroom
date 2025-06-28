const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Password only required for non-Google users
    },
  },
  googleId: {
    type: String,
    sparse: true,
  },
  profilePicture: {
    type: String,
  },
  isGoogleUser: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });
module.exports = mongoose.model("User", UserSchema);
