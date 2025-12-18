const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const feedbackCtrl = require("../controllers/feedbackController");
const userCtrl = require("../controllers/userController");
const { upload, process3x4Image } = require("../middleware/upload3x4");

// Upload ảnh 3x4
router.post(
  "/upload-photo-3x4",
  auth,
  upload,
  process3x4Image,
  userCtrl.uploadPhoto3x4
);

// Gửi feedback
router.post("/feedback", auth, feedbackCtrl.submitFeedback);

router.get(
    "/interview/status",
    auth,
    userCtrl.getInterviewStatus
);
module.exports = router;
