const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const auth = require("../middleware/auth");

/* =====================================
      AUTHENTICATION ROUTES
      (đăng nhập qua tài khoản SV5T)
===================================== */

// Đăng nhập (participant - MSSV)
router.post("/login", authCtrl.login);

// Đăng nhập admin (tài khoản Admin của SV5T)
router.post("/admin-login", authCtrl.adminLogin);

// Hoàn tất hồ sơ (email/phone/faculty/university) lần đầu đăng nhập
router.put("/complete-profile", auth, authCtrl.completeProfile);

// Đăng xuất
router.post("/logout", authCtrl.logout);


/* =====================================
      LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP
===================================== */
router.get("/me", auth, authCtrl.getMe);

module.exports = router;
