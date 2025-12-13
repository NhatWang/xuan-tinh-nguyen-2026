const express = require("express");
const router = express.Router();

const MediaRegistration = require("../models/MediaRegistration");
const authMiddleware = require("../middleware/auth");

/* ============================================================
   1) USER SUBMIT MEDIA TEAM
   POST /api/media
============================================================ */
router.post("/", authMiddleware, async (req, res) => {
  try {

    if (process.env.REGISTRATION_CLOSED === "true") {
      return res.status(403).json({ msg: "Đã hết thời gian đăng ký." });
    }
    
    const {
      dob,
      gender,
      facebook,
      address,
      major,
      bio,
      health,

      cdtn,
      vehicle,
      license,

      mediaRoles,       // array
      mediaLocations,   // array
      size
    } = req.body;

    // 1. Kiểm tra user đã đăng ký chưa
    const existed = await MediaRegistration.findOne({ userId: req.user.id });
    if (existed) {
      return res.status(400).json({ msg: "Bạn đã đăng ký đội hình truyền thông rồi." });
    }

    // 2. Tạo form đăng ký mới
    await MediaRegistration.create({
      userId: req.user.id,

      dob,
      gender,
      facebook,
      address,
      major,
      bio,
      health,

      cdtn,
      vehicle,
      license,

      mediaRoles: mediaRoles || [],
      mediaLocations: mediaLocations || [],
      size
    });

    res.json({ msg: "Đăng ký đội hình truyền thông thành công!" });

  } catch (err) {
    console.log("MEDIA REGISTER ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({ msg: "Bạn đã đăng ký trước đó, vui lòng liên hệ admin." });
    }

    res.status(500).json({ msg: "Lỗi server, vui lòng thử lại." });
  }
});

/* ============================================================
   2) GET MEDIA FORM CỦA USER
   GET /api/media/me
============================================================ */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const reg = await MediaRegistration.findOne({ userId: req.user.id });

    if (!reg) {
      return res.status(404).json({ msg: "Bạn chưa đăng ký đội hình truyền thông." });
    }

    res.json(reg);

  } catch (err) {
    console.log("ERR /media/me:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
