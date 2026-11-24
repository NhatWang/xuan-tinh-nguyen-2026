const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { verifyStudentViaSV5T, verifyAdminViaSV5T } = require("../utils/sv5t");

/* ======================================================
   LOGIN — xác thực qua tài khoản SV5T (Hành trình cùng nhau 5 Tốt)
====================================================== */
exports.login = async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password)
      return res.status(400).json({ msg: "Vui lòng nhập MSSV và mật khẩu" });

    const result = await verifyStudentViaSV5T(studentId.trim(), password);

    if (!result.ok) {
      return res.status(result.status).json({ msg: result.message });
    }

    const { fullName, className } = result.student;

    let user = await User.findOne({ studentId: studentId.trim() });

    if (!user) {
      user = await User.create({
        studentId: studentId.trim(),
        fullName,
        className
      });
    } else {
      // Đồng bộ lại họ tên/lớp mới nhất từ SV5T mỗi lần đăng nhập
      user.fullName = fullName;
      user.className = className;
      await user.save();
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
   ADMIN LOGIN — xác thực qua tài khoản Admin của SV5T
====================================================== */
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ msg: "Vui lòng nhập username và mật khẩu" });

    const result = await verifyAdminViaSV5T(username.trim(), password);

    if (!result.ok) {
      return res.status(result.status).json({ msg: result.message });
    }

    let user = await User.findOne({ username: username.trim() });

    if (!user) {
      user = await User.create({
        username: username.trim(),
        fullName: username.trim(),
        role: "admin"
      });
    } else if (user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
   HOÀN TẤT HỒ SƠ — điền email/phone/faculty/university lần đầu
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
  const user = await User.findById(req.user.id);
  res.json(user);
};
