const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const auth = require("../middleware/auth");

/* =====================================
      AUTHENTICATION ROUTES
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

// Đăng xuất
router.post("/logout", authCtrl.logout);


/* =====================================
      LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP
===================================== */
router.get("/me", auth, authCtrl.getMe);

module.exports = router;
