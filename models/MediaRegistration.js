const mongoose = require("mongoose");

const MediaRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true   // ❗ Một user chỉ đăng ký truyền thông 1 lần
    },

    gender: String,
    dob: Date,
    facebook: String,
    address: String,
    major: String,

    bio: String,
    health: String,

    cdtn: String,       // Đã từng / Chưa từng
    vehicle: String,    // Xe máy 50cc / trên 50cc / Không
    license: String,    // Có / Không

    // ---- MẢNG TRUYỀN THÔNG ----
    mediaRoles: [String],       // Tư liệu, Thiết kế, Content
    mediaLocations: [String],   // Các địa phương chọn

    size: String,

    // ---- PHỎNG VẤN ----
    interviewNote: String,
    interviewResult: String,
    interviewer: String,
  },
  { timestamps: true } // createdAt, updatedAt
);

module.exports = mongoose.model("MediaRegistration", MediaRegistrationSchema);
