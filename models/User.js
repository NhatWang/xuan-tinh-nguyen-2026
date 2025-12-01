const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String },
  className: { type: String },
  faculty: { type: String },
  university: { type: String },

  studentId: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, sparse: true },

  password: { type: String },

  isVerified: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["participant", "admin"],
    default: "participant"
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  verifyEmailToken: String,
  verifyEmailExpire: Date
});

module.exports = mongoose.model("User", userSchema);
