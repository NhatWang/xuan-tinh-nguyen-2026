const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const feedbackCtrl = require("../controllers/feedbackController");
const userCtrl = require("../controllers/userController");

// Gửi feedback
router.post("/feedback", auth, feedbackCtrl.submitFeedback);

router.get(
    "/interview/status",
    auth,
    userCtrl.getInterviewStatus
);
module.exports = router;
