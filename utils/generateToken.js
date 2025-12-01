const jwt = require("jsonwebtoken");

module.exports = function generateToken(user) {
  return jwt.sign(
    { id: user._id }, 
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
