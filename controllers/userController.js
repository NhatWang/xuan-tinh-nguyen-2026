const Registration = require("../models/Registration");

/* =====================================================
   USER – GET ONLINE INTERVIEW STATUS
===================================================== */
exports.getInterviewStatus = async (req, res) => {
  try {
    const reg = await Registration.findOne({ userId: req.user.id });

    if (!reg)
      return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

    // ❌ Không phải phỏng vấn online
    if (reg.interviewLocation !== "Khác") {
      return res.json({ online: false });
    }

    const status = reg.interviewStatus || "idle";

    res.json({
      online: true,
      status,
      canJoin: status === "calling",
      roomId: status === "calling" ? reg.interviewRoomId : null,
      startedAt: reg.interviewStartedAt || null,
      endedAt: reg.interviewEndedAt || null
    });

  } catch (err) {
    console.error("getInterviewStatus error:", err);
    res.status(500).json({ msg: "Lỗi lấy trạng thái phỏng vấn" });
  }
};
