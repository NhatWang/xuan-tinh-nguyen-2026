const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
{
    userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    fullName: {             // ⭐ Lưu tên user tại thời điểm gửi feedback
        type: String,
        required: true
    },

    rating: {               // ⭐ Số sao
        type: Number,
        min: 1,
        max: 5,
        required: true
    },

    comment: {              // ⭐ Nội dung feedback
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Feedback", FeedbackSchema);
