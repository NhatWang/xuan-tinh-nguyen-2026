const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String },
  className: { type: String },
  faculty: { type: String },
  university: { type: String },

  // Đăng ký thủ công (mọi khoa/trường): email+password
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String },
  isVerified: { type: Boolean, default: false },

  // Đăng nhập nhanh qua SV5T (chỉ khoa Hóa) — participant dùng studentId, admin dùng username
  studentId: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true, sparse: true },

  // true khi đã có đủ email/phone (tự động với đăng ký thủ công; cần điền thêm nếu vào qua SV5T)
  profileCompleted: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["participant", "admin"],
    default: "participant"
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  verifyEmailToken: String,
  verifyEmailExpire: Date,

  photo3x4: {
  type: String, // /uploads/3x4/abc.jpg
  default: null
}
});

module.exports = mongoose.model("User", userSchema);
