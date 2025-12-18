const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// temp upload (memory)
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.match(/^image\/(jpeg|jpg|png)$/)) {
      cb(new Error("Chỉ chấp nhận ảnh JPG / PNG"));
    }
    cb(null, true);
  }
}).single("photo");

// xử lý resize + crop
const process3x4Image = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const uploadDir = path.join(__dirname, "../public/uploads/3x4");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${req.user.id}_${Date.now()}.jpg`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize(300, 400, {
        fit: "cover",        // crop center
        position: "centre"
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    // gắn path cho controller dùng
    req.processedImagePath = `/uploads/3x4/${filename}`;
    next();

  } catch (err) {
    console.error("Image processing error:", err);
    res.status(500).json({ msg: "Lỗi xử lý ảnh" });
  }
};

module.exports = {
  upload,
  process3x4Image
};
