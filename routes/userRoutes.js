const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const feedbackCtrl = require("../controllers/feedbackController");

// Gửi feedback
router.post("/feedback", auth, feedbackCtrl.submitFeedback);

const feedbackCtrl = require("../controllers/feedbackController");

router.get("/feedback/all", auth, admin, feedbackCtrl.getAllFeedback);


module.exports = router;
