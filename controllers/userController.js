const Registration = require("../models/Registration");
const User = require("../models/User");

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

exports.uploadPhoto3x4 = async (req, res) => {
  try {
    if (!req.processedImagePath) {
      return res.status(400).json({ msg: "Không có ảnh được upload" });
    }

    // ✅ CHECK ĐIỀU KIỆN ĐẬU TRƯỚC
    const reg = await Registration.findOne({ userId: req.user.id });

    if (
      !reg ||
      !reg.interviewResult ||
      !reg.interviewResult.startsWith("Đậu NV")
    ) {
      return res.status(403).json({
        msg: "Chỉ thí sinh trúng tuyển mới được upload ảnh"
      });
    }

    // ✅ SAU KHI HỢP LỆ → UPDATE USER
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo3x4: req.processedImagePath },
      { new: true }
    ).select("photo3x4");

    res.json({
      msg: "Upload ảnh 3x4 thành công",
      photo3x4: user.photo3x4
    });

  } catch (err) {
    console.error("uploadPhoto3x4 error:", err);
    res.status(500).json({ msg: "Lỗi server upload ảnh" });
  }
};

