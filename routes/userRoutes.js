const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const feedbackCtrl = require("../controllers/feedbackController");

// Gửi feedback
router.post("/feedback", auth, feedbackCtrl.submitFeedback);


module.exports = router;
