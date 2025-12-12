const Registration = require("../models/Registration");
const { createDailyRoom } = require("../utils/daily");

/* =====================================================
   ONLINE INTERVIEW – DAILY.CO (PRODUCTION FLOW)
===================================================== */

/**
 * API 0 – LẤY THÔNG TIN PHỎNG VẤN ONLINE
 * ❌ KHÔNG tạo room
 * ❌ KHÔNG reset status
 * 👉 Chỉ dùng để admin xem thông tin ứng viên
 */
exports.getInterviewRoom = async (req, res) => {
  try {
    const { regId } = req.params;

    const reg = await Registration
      .findById(regId)
      .populate("userId");

    if (!reg)
      return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

    if (reg.interviewLocation !== "Khác")
      return res.status(400).json({ msg: "Không phải phỏng vấn online" });

    res.json({
      status: reg.interviewStatus || "idle",
      user: reg.userId
    });

  } catch (err) {
    console.error("getInterviewRoom error:", err);
    res.status(500).json({ msg: "Lỗi lấy thông tin phỏng vấn" });
  }
};

/**
 * API 2 – BẮT ĐẦU PHỎNG VẤN ONLINE
 * ✅ Tạo Daily room tại đây (DUY NHẤT)
 * ✅ Emit realtime cho user
 */
exports.startInterviewOnline = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg)
      return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

    if (reg.interviewLocation !== "Khác")
      return res.status(400).json({ msg: "Không phải phỏng vấn online" });

    if (reg.interviewStatus === "calling")
      return res.status(400).json({ msg: "Phỏng vấn đang diễn ra" });

    // ⭐ TẠO DAILY ROOM (CHỈ TẠI ĐÂY)
    const roomName = `xtn-${reg._id}`;
    const dailyRoom = await createDailyRoom(roomName);

    reg.interviewRoomId = dailyRoom.url;   // FULL URL
    reg.interviewStatus = "calling";
    reg.interviewStartedAt = new Date();
    reg.interviewEndedAt = null;

    await reg.save();

    // ⭐ SOCKET EMIT CHO USER
    const io = req.app.get("io");
    io.to(reg.userId.toString()).emit("interview:calling", {
      regId: reg._id,
      roomUrl: reg.interviewRoomId
    });

    res.json({
      msg: "Đã bắt đầu phỏng vấn online",
      room: reg.interviewRoomId
    });

  } catch (err) {
    console.error("startInterviewOnline error:", err);
    res.status(500).json({ msg: "Lỗi bắt đầu phỏng vấn online" });
  }
};

/**
 * API 3 – KẾT THÚC PHỎNG VẤN ONLINE
 * ✅ Update trạng thái
 * ✅ Emit realtime cho user
 */
exports.endInterviewOnline = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg)
      return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

    if (reg.interviewStatus !== "calling")
      return res.status(400).json({ msg: "Phỏng vấn chưa bắt đầu" });

    reg.interviewStatus = "ended";
    reg.interviewEndedAt = new Date();

    await reg.save();

    // ⭐ SOCKET EMIT CHO USER
    const io = req.app.get("io");
    io.to(reg.userId.toString()).emit("interview:ended");

    res.json({ msg: "Đã kết thúc phỏng vấn online" });

  } catch (err) {
    console.error("endInterviewOnline error:", err);
    res.status(500).json({ msg: "Lỗi kết thúc phỏng vấn online" });
  }
};
