const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Registration = require("../models/Registration");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* ============================================================
   1. API: LẤY DANH SÁCH NGƯỜI ĐĂNG KÝ CHO ADMIN DASHBOARD
   GET /api/admin/list
============================================================ */
router.get("/list", auth, admin, async (req, res) => {
    try {
        const registrations = await Registration
            .find()
            .populate("userId")
            .sort({ createdAt: -1 });

        const data = registrations.map(reg => ({
            user: reg.userId,
            reg
        }));

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi lấy danh sách đăng ký" });
    }
});


/* ============================================================
   2. API: EXPORT PDF THEO registrationId
   GET /api/admin/export/:regId
============================================================ */
router.get("/export/:regId", auth, admin, async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.regId).populate("userId");

        if (!reg) {
            return res.status(404).json({ msg: "Không tìm thấy đăng ký" });
        }

        const user = reg.userId;

        const templatePath = path.join(__dirname, "../templates/registration_template.html");
        let html = fs.readFileSync(templatePath, "utf8");

        const replace = (key, value) => {
            html = html.replace(new RegExp(`{{${key}}}`, "g"), value || "");
        };

        replace("fullName", user.fullName);
        replace("studentId", user.studentId);
        replace("className", user.className);
        replace("faculty", user.faculty);
        replace("university", user.university);
        replace("email", user.email);
        replace("phone", user.phone);

        replace("dob", reg.dob);
        replace("gender", reg.gender);
        replace("facebook", reg.facebook);
        replace("address", reg.address);

        replace("nv1", reg.nv1);
        replace("nv2", reg.nv2);
        replace("nv3", reg.nv3);
        replace("nv4", reg.nv4);
        replace("nv5", reg.nv5);

        replace("skills", reg.skills?.join(", "));
        replace("size", reg.size);
        replace("bio", reg.bio);
        replace("health", reg.health);

        replace("cdtn", reg.cdtn);
        replace("vehicle", reg.vehicle);
        replace("license", reg.license);
        replace("lab", reg.lab);

        replace("interviewNote", reg.interviewNote || "");
        replace("interviewResult", reg.interviewResult || "");

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename=${user.fullName}.pdf`
        });

        res.send(pdf);

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi xuất PDF" });
    }
});


/* ============================================================
   3. API: UPDATE PHỎNG VẤN THEO registrationId
   PUT /api/admin/interview/:regId
============================================================ */
router.put("/interview/:regId", auth, admin, async (req, res) => {
    try {
        const { interviewNote, interviewResult } = req.body;

        if (!interviewResult) {
            return res.status(400).json({ msg: "Thiếu kết quả phỏng vấn" });
        }

        const updated = await Registration.findByIdAndUpdate(
            req.params.regId,
            { interviewNote, interviewResult },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: "Không tìm thấy đăng ký" });
        }

        res.json({ msg: "Đã cập nhật phỏng vấn", updated });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi cập nhật phỏng vấn" });
    }
});

router.put("/interview/:userId", auth, admin, async (req, res) => {
  try {
    const { interviewNote, interviewResult, interviewer } = req.body;

    if (!interviewer)
      return res.status(400).json({ msg: "Vui lòng chọn người phỏng vấn!" });

    await Registration.findOneAndUpdate(
      { userId: req.params.userId },
      { interviewNote, interviewResult, interviewer }
    );

    res.json({ msg: "Đã cập nhật phỏng vấn" });

  } catch (err) {
    res.status(500).json({ msg: "Lỗi cập nhật phỏng vấn" });
  }
});


module.exports = router;
