const Feedback = require("../models/Feedback");
const User = require("../models/User");

exports.submitFeedback = async (req, res) => {
    try {
        const userId = req.user.id;   // middleware auth đã decode token
        const { rating, feedback } = req.body;

        if (!rating || rating < 1 || rating > 5)
            return res.status(400).json({ msg: "Rating không hợp lệ!" });

        // 🔥 Lấy thông tin user đang đăng nhập
        const user = await User.findById(userId).select("fullName");
        if (!user)
            return res.status(404).json({ msg: "Không tìm thấy user!" });

        // Lưu feedback vào DB
        await Feedback.create({
            userId,
            fullName: user.fullName,   // ⭐ Tự động lưu tên người dùng
            rating,
            comment: feedback          // ⭐ Đổi tên trường cho đúng model
        });

        return res.json({ msg: "Đã lưu feedback!" });

    } catch (err) {
        console.error("Feedback error:", err);
        return res.status(500).json({ msg: "Lỗi server!" });
    }
};
