const User = require("../models/User");
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
   OAUTH CALLBACK — đổi code lấy từ SV5T ra session của app này
   (đăng nhập qua SV5T theo kiểu "Đăng nhập bằng Google/Zalo")
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
        user = await User.create({ username, fullName: username, role: "admin" });
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
