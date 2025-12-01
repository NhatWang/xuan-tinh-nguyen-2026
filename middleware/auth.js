const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    // 1. Lấy token từ cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ msg: "Bạn cần đăng nhập trước" });
    }

    // 2. Giải mã token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ msg: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });
    }

    // 3. Lấy user từ DB
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ msg: "Người dùng không tồn tại" });
    }

    // 4. Gắn vào req để dùng tiếp
    req.user = user;

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ msg: "Xác thực thất bại" });
  }
};
