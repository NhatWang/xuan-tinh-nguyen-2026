const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");

/* ======================================================
   REGISTER
====================================================== */
exports.register = async (req, res) => {
  try {
    const { 
      fullName, className, faculty, university,
      studentId, email, phone, password 
    } = req.body;

    // Kiểm tra thông tin
    if (!fullName || !email || !password)
      return res.status(400).json({ msg: "Thiếu thông tin bắt buộc" });

    if (password.length < 6)
      return res.status(400).json({ msg: "Mật khẩu phải có ít nhất 6 ký tự" });

    // Trùng email
    if (await User.findOne({ email })) 
      return res.status(400).json({ msg: "Email đã tồn tại" });

    // Trùng MSSV
    if (studentId && await User.findOne({ studentId }))
      return res.status(400).json({ msg: "MSSV đã tồn tại" });

    // Trùng số điện thoại
    if (phone && await User.findOne({ phone }))
      return res.status(400).json({ msg: "Số điện thoại đã tồn tại" });

    // Mã hoá mật khẩu
    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString("hex");

    await User.create({
      fullName, className, faculty, university,
      studentId, email, phone,
      password: hashed,
      verifyEmailToken: verifyToken,
      verifyEmailExpire: Date.now() + 3600000 // 1 giờ
    });

    // Gửi email verify
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email.html?token=${verifyToken}`;

    await sendEmail(email, "Xác minh email", 
      `<p>Nhấn để xác minh tài khoản:</p><a href="${verifyUrl}">${verifyUrl}</a>`
    );

    res.json({ msg: "Đăng ký thành công! Hãy kiểm tra email để xác minh." });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   VERIFY EMAIL
====================================================== */
exports.verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      verifyEmailToken: token,
      verifyEmailExpire: { $gt: Date.now() }
    });

    if (!user) 
      return res.status(400).json({ msg: "Token không hợp lệ hoặc đã hết hạn" });

    user.isVerified = true;
    user.verifyEmailToken = undefined;
    user.verifyEmailExpire = undefined;

    await user.save();

    res.json({ msg: "Xác minh email thành công!" });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   LOGIN
====================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "Không tìm thấy tài khoản" });

    if (!user.isVerified)
      return res.status(400).json({ msg: "Email chưa được xác minh" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Sai mật khẩu" });

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // ⭐ TRẢ ROLE VỀ CLIENT
    res.json({
      msg: "Đăng nhập thành công",
      role: user.role
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   FORGOT PASSWORD
====================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ msg: "Không tìm thấy email" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60000; // 10 phút
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}`;

    await sendEmail(
      user.email,
      "Reset mật khẩu",
      `<p>Nhấn để đặt lại mật khẩu:</p><a href="${resetUrl}">${resetUrl}</a>`
    );

    res.json({ msg: "Đã gửi link reset mật khẩu vào email!" });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   RESET PASSWORD
====================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) 
      return res.status(400).json({ msg: "Token không hợp lệ hoặc hết hạn" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ msg: "Đổi mật khẩu thành công!" });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   LOGOUT
====================================================== */
exports.logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ msg: "Đã đăng xuất" });
};


/* ======================================================
   GET CURRENT USER
====================================================== */
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};
