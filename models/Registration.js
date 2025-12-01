const mongoose = require("mongoose");

const RegistrationSchema = new mongoose.Schema(
{
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        unique: true                    // ⛔ Chống đăng ký trùng
    },

    // --- Thông tin cá nhân ---
    dob: { type: Date },               // nên dùng Date
    gender: { 
        type: String, 
        enum: ["Nam", "Nữ", "Khác"],   // giới hạn giá trị hợp lệ
        default: "Khác"
    },
    facebook: { 
        type: String,
        validate: {
            validator: (v) => !v || /^https?:\/\/(www\.)?facebook\.com\/.+/.test(v),
            message: "Facebook link không hợp lệ"
        }
    },
    address: { type: String },

    // --- Nguyện vọng ---
    nv1: { type: String },
    nv2: { type: String },
    nv3: { type: String },
    nv4: { type: String },
    nv5: { type: String },

    // --- Kỹ năng ---
    skills: { 
        type: [String], 
        default: [] 
    },

    size: { type: String },
    bio: { type: String },
    health: { type: String },

    cdtn: { type: String },         // Đã từng / Chưa từng tham gia
    vehicle: { type: String },      // Phương tiện di chuyển
    license: { type: String },      // Bằng lái
    lab: { type: String },          // Kỹ năng Lab / Hóa

    // --- Phỏng vấn ---
    interviewNote: { type: String },
    interviewResult: { 
        type: String,
        enum: ["pending", "pass", "fail"],
        default: "pending"
    },

    interviewer: { type: String, default: "" },

    //

    createdAt: { type: Date, default: Date.now }
},
{
    timestamps: true                 // thêm updatedAt tự động
});

// Tạo index để chống duplicate userId
RegistrationSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("Registration", RegistrationSchema);
