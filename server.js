const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

app.set("trust proxy", 1); 

const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

// ===============================
// 1. KẾT NỐI DATABASE
// ===============================
connectDB();

// ===============================
// 2. CORS TỰ TẠO (CHUẨN CHO COOKIE)
// ===============================
const allowedOrigins = [
  "https://xtnhoahoc2026.id.vn",
  "https://www.xtnhoahoc2026.id.vn"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://xtnhoahoc2026.id.vn");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "Set-Cookie");

  // ⭐ THÊM NGAY DƯỚI ĐÂY
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


// ===============================
// 3. MIDDLEWARE
// ===============================
app.use(express.json());
app.use(cookieParser());

// ===============================
// 4. API ROUTES
// ===============================
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", require("./routes/auth"));
app.use("/api/registration", require("./routes/registration"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/media", require("./routes/adminMedia"));
app.use("/api/media", require("./routes/media"));
app.use("/api/interview-queue", require("./routes/interviewQueue"));

// ===============================
// 5. STATIC FRONTEND (nếu cần)
// ===============================
app.use(express.static("public"));
app.use("/avatars", express.static("public/avatars"));

// ===============================
// 6. CUSTOM ROUTES
// ===============================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

// ===============================
// 7. START SERVER
// ===============================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));