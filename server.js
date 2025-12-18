const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

app.set("trust proxy", 1);

const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

// ===============================
// 1. KẾT NỐI DATABASE
// ===============================
connectDB();

// ===============================
// 2. CORS TỰ TẠO (CHUẨN COOKIE)
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
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ===============================
// 3. MIDDLEWARE
// ===============================
app.use(express.json());
app.use(cookieParser());

// ===============================
// 4. ROUTES
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
app.use("/api/user", require("./routes/userRoutes"));

// ===============================
// 5. STATIC
// ===============================
app.use(express.static("public"));
app.use("/avatars", express.static("public/avatars"));

app.use("/uploads", express.static("public/uploads"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

// ===============================
// 6. SOCKET.IO SETUP (⭐ STEP 2)
// ===============================
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// ⭐ CHO CONTROLLER DÙNG
app.set("io", io);

// ⭐ SOCKET CONNECTION
io.on("connection", socket => {
  console.log("🟢 Socket connected:", socket.id);

  // ⭐ USER JOIN ROOM RIÊNG
  socket.on("join:user", userId => {
    if (!userId)
return; socket.join(userId);
    console.log("👤 User joined room:", userId);
  });

  // ⭐ ADMIN JOIN ROOM (OPTIONAL – DEBUG)
  socket.on("join:admin", () => {
    socket.join("admins");
    console.log("👑 Admin joined room");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// ===============================
// 7. START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("🚀 Server + Socket.io running on port", PORT);
});
