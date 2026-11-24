const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const auth = require("../middleware/auth");

/* =====================================
      AUTHENTICATION ROUTES
      (đăng ký thủ công — mọi khoa/trường)
===================================== */

// Đăng ký
router.post("/register", authCtrl.register);

// Xác minh email
router.get("/verify-email/:token", authCtrl.verifyEmail);

// Đăng nhập
router.post("/login", authCtrl.login);

// Quên mật khẩu
router.post("/forgot-password", authCtrl.forgotPassword);

// Reset mật khẩu
router.put("/reset-password/:token", authCtrl.resetPassword);

// Đăng nhập nhanh qua SV5T (tùy chọn, chỉ khoa Hóa) — đổi authorization code lấy session
router.post("/oauth-callback", authCtrl.oauthCallback);

// Hoàn tất hồ sơ (email/phone/faculty/university) — cho tài khoản vào qua SV5T
router.put("/complete-profile", auth, authCtrl.completeProfile);

// Đăng xuất
router.post("/logout", authCtrl.logout);


/* =====================================
      LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP
===================================== */
router.get("/me", auth, authCtrl.getMe);

module.exports = router;
