const Registration = require("../models/Registration");

/* =====================================================
   ONLINE INTERVIEW – STEP 2
===================================================== */

// API 0 – LẤY / TẠO PHÒNG PHỎNG VẤN (CHO VIDEO CALL)
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

    if (!reg.interviewRoomId) {
      reg.interviewRoomId = `XTN-ONLINE-${regId}`;
    }

    if (!reg.interviewStatus) {
      reg.interviewStatus = "waiting";
    }

    await reg.save();

    res.json({
      roomId: reg.interviewRoomId,
      status: reg.interviewStatus,
      reg,
      user: reg.userId     // ⭐ QUAN TRỌNG
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Lỗi lấy phòng phỏng vấn" });
  }
};

// API 1 – GÁN PHÒNG PHỎNG VẤN ONLINE
exports.assignInterviewRoom = async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.id);

        if (!reg)
            return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

        if (reg.interviewLocation !== "Khác") {
            return res.status(400).json({
                msg: "Chỉ phỏng vấn online khi địa điểm là 'Khác'"
            });
        }

        reg.interviewRoomId = req.body.roomId;
        reg.interviewStatus = "waiting";
        await reg.save();

        // ⭐ SOCKET EMIT (REALTIME)
        const io = req.app.get("io");
        io.emit("interview:update", {
            regId: reg._id,
            status: "waiting",
            roomId: reg.interviewRoomId
        });

        res.json({
            msg: "Đã gán phòng phỏng vấn online",
            roomId: reg.interviewRoomId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi gán phòng online" });
    }
};



// API 2 – BẮT ĐẦU PHỎNG VẤN ONLINE
exports.startInterviewOnline = async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.id);

        if (!reg)
            return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

        if (reg.interviewLocation !== "Khác")
            return res.status(400).json({ msg: "Không phải online" });

        reg.interviewStatus = "calling";
        reg.interviewStartedAt = new Date();
        await reg.save();

        const io = req.app.get("io");
        io.emit("interview:update", {
            regId: reg._id,
            status: "calling"
        });

        res.json({ msg: "Đã bắt đầu phỏng vấn online" });

    } catch (err) {
        res.status(500).json({ msg: "Lỗi bắt đầu phỏng vấn" });
    }
};



// API 3 – KẾT THÚC PHỎNG VẤN ONLINE
exports.endInterviewOnline = async (req, res) => {
    try {
        const io = req.app.get("io");   // ⭐ LẤY SOCKET.IO

        const reg = await Registration.findById(req.params.id);
        if (!reg)
            return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

        // Cập nhật trạng thái
        reg.interviewStatus = "ended";
        reg.interviewEndedAt = new Date();

        await reg.save();

        // ⭐ EMIT CHO USER (RẤT QUAN TRỌNG)
        io.to(`user_${reg.userId}`).emit("interview:ended");

        res.json({ msg: "Đã kết thúc phỏng vấn online" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi kết thúc phỏng vấn online" });
    }
};

