const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String },
  className: { type: String },
  faculty: { type: String },
  university: { type: String },

  // Đăng nhập qua tài khoản SV5T — studentId là định danh chính
  studentId: { type: String, unique: true, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },

  // true sau khi user điền bổ sung email/phone/faculty/university lần đầu
  profileCompleted: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["participant", "admin"],
    default: "participant"
  },

  photo3x4: {
  type: String, // /uploads/3x4/abc.jpg
  default: null
}
});

module.exports = mongoose.model("User", userSchema);
