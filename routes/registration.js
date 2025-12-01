const express = require("express");
const router = express.Router();
const Registration = require("../models/Registration");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      dob,
      gender,
      facebook,
      address,
      nv1, nv2, nv3, nv4, nv5,
      skills,
      size,
      bio,
      health,
      cdtn,
      vehicle,
      license,
      lab
    } = req.body;

    // 1. Check duplicate registration
    const existed = await Registration.findOne({ userId: req.user.id });
    if (existed) {
      return res.status(400).json({ msg: "Bạn đã đăng ký trước đó rồi." });
    }

    // 2. Create new registration
    await Registration.create({
      userId: req.user.id,

      // personal info
      dob,
      gender,
      facebook,
      address,

      // preferences
      nv1, nv2, nv3, nv4, nv5,

      // skills
      skills: skills || [],

      size,
      bio,
      health,
      cdtn,
      vehicle,
      license,
      lab
    });

    res.json({ msg: "Đăng ký thành công!" });

  } catch (err) {
    console.log("ĐĂNG KÝ LỖI:", err);

    // 3. Duplicate error (userId unique)
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Bạn đã đăng ký trước đó, vui lòng liên hệ admin để được hỗ trợ." });
    }

    res.status(500).json({ msg: "Lỗi server, vui lòng thử lại." });
  }
});

// Lấy thông tin đăng ký của chính user đang đăng nhập
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const reg = await Registration.findOne({ userId: req.user.id });

    if (!reg) {
      return res.status(404).json({ msg: "Chưa đăng ký" });
    }

    res.json(reg);

  } catch (err) {
    console.log("ERR /registration/me:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
