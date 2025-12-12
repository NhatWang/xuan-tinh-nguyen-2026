const Registration = require("../models/Registration");

exports.getInterviewStatus = async (req, res) => {
    try {
        const reg = await Registration.findOne({ userId: req.user.id });

        if (!reg)
            return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

        // ⭐ Chỉ online
        if (reg.interviewLocation !== "Khác") {
            return res.json({ online: false });
        }

        res.json({
            online: true,
            status: reg.interviewStatus,
            roomId: reg.interviewRoomId,
            startedAt: reg.interviewStartedAt,
            endedAt: reg.interviewEndedAt
        });

    } catch (err) {
        res.status(500).json({ msg: "Lỗi lấy trạng thái phỏng vấn" });
    }
};
