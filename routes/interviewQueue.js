const express = require("express");
const router = express.Router();
const Registration = require("../models/Registration");
const User = require("../models/User");

// API: Lấy danh sách thứ tự phỏng vấn theo NV1 + STT
router.get("/", async (req, res) => {
    try {
        // Lấy tất cả người đã điểm danh, còn trong hàng đợi
        const list = await Registration.find({
        attendance: true,
        interviewOrder: { $ne: null },
        interviewResult: { $in: ["", "Chưa phỏng vấn"] }
    })
    .sort({ interviewOrder: 1 })
    .populate("userId", "fullName studentId")
    .lean();

        res.json(list);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
