const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");
const { exchangeOAuthCode } = require("../utils/sv5t");

function setAuthCookie(res, user) {
  const token = generateToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

/* ======================================================
   REGISTER — đăng ký thủ công, dành cho mọi khoa/trường
====================================================== */
exports.register = async (req, res) => {
  try {
    const {
      fullName, className, faculty, university,
      studentId, email, phone, password
    } = req.body;

    if (!fullName || !email || !password)
      return res.status(400).json({ msg: "Thiếu thông tin bắt buộc" });

    if (password.length < 6)
      return res.status(400).json({ msg: "Mật khẩu phải có ít nhất 6 ký tự" });

    if (await User.findOne({ email }))
      return res.status(400).json({ msg: "Email đã tồn tại" });

    if (studentId && await User.findOne({ studentId }))
      return res.status(400).json({ msg: "MSSV đã tồn tại" });

    if (phone && await User.findOne({ phone }))
      return res.status(400).json({ msg: "Số điện thoại đã tồn tại" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      fullName, className, faculty, university,
      studentId, email, phone,
      password: hashed,
      profileCompleted: true // đã có email/phone ngay từ lúc đăng ký
    });

    res.json({ msg: "Đăng ký thành công! Bạn có thể đăng nhập ngay." });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   LOGIN — email + password (tài khoản đăng ký thủ công)
====================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(404).json({ msg: "Không tìm thấy tài khoản" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Sai mật khẩu" });

    setAuthCookie(res, user);

    res.json({
      msg: "Đăng nhập thành công",
      role: user.role,
      profileCompleted: user.profileCompleted
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

    const resetUrl = `${process.env.CLIENT_URL}/reset.html?token=${resetToken}`;

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
   OAUTH CALLBACK — đăng nhập nhanh qua SV5T (chỉ khoa Hóa),
   kiểu "Đăng nhập bằng Google/Zalo", tùy chọn bên cạnh register/login
====================================================== */
exports.oauthCallback = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code)
      return res.status(400).json({ msg: "Thiếu code" });

    const result = await exchangeOAuthCode(code);

    if (!result.ok) {
      return res.status(result.status).json({ msg: result.message });
    }

    const { type } = result.data;
    let user;

    if (type === "admin") {
      const { username } = result.data;

      user = await User.findOne({ username });

      if (!user) {
        user = await User.create({
          username,
          fullName: username,
          role: "admin",
          profileCompleted: true // admin không cần hoàn tất hồ sơ
        });
      } else if (user.role !== "admin") {
        user.role = "admin";
        await user.save();
      }
    } else {
      const { studentId, fullName, className } = result.data;

      user = await User.findOne({ studentId });

      if (!user) {
        user = await User.create({ studentId, fullName, className });
      } else {
        user.fullName = fullName;
        user.className = className;
        await user.save();
      }
    }

    setAuthCookie(res, user);

    res.json({
      msg: "Đăng nhập thành công",
      role: user.role,
      profileCompleted: user.profileCompleted
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ======================================================
   HOÀN TẤT HỒ SƠ — điền email/phone/faculty/university
   (chỉ cần cho tài khoản vào qua SV5T, vốn chưa có 2 field này)
====================================================== */
exports.completeProfile = async (req, res) => {
  try {
    const { email, phone, faculty, university } = req.body;

    if (!email || !phone)
      return res.status(400).json({ msg: "Thiếu thông tin bắt buộc" });

    if (await User.findOne({ email, _id: { $ne: req.user.id } }))
      return res.status(400).json({ msg: "Email đã tồn tại" });

    if (await User.findOne({ phone, _id: { $ne: req.user.id } }))
      return res.status(400).json({ msg: "Số điện thoại đã tồn tại" });

    const user = await User.findById(req.user.id);
    user.email = email;
    user.phone = phone;
    if (faculty) user.faculty = faculty;
    if (university) user.university = university;
    user.profileCompleted = true;

    await user.save();

    res.json({ msg: "Cập nhật hồ sơ thành công" });

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
