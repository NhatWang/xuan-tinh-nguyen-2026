const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

// ===============================
// 1. KẾT NỐI DATABASE
// ===============================
connectDB();

// ===============================
// 2. CORS CHUẨN CHO COOKIE + FRONTEND
// ===============================
app.use(cors({
  origin: [
    "https://xuan-tinh-nguyen-2026-production.up.railway.app",
    "https://xtnhoahoc2026.id.vn"
  ],
  credentials: true
}));

// ===============================
// 3. MIDDLEWARE
// ===============================
app.use(express.json());
app.use(cookieParser());

// ===============================
// 4. API ROUTES
// ===============================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/registration", require("./routes/registration"));
app.use("/api/admin", require("./routes/admin"));

// ===============================
// 5. STATIC FRONTEND (nếu cần)
// ===============================
app.use(express.static("public/frontend-dang-ky"));

// ===============================
// 6. CUSTOM ROUTES
// ===============================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/frontend-dang-ky/login.html");
});

// ===============================
// 7. START SERVER
// ===============================

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});
