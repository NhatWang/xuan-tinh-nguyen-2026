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

        // ==========================
        // Replace Helper
        // ==========================
        const replace = (key, value) => {
            html = html.replace(new RegExp(`{{${key}}}`, "g"), value || "");
        };

        const checkBox = (value, target) => (value === target ? "checked" : "");

        // ==========================
        // Fill TEXT fields
        // ==========================
        replace("fullName", user.fullName);
        replace("studentId", user.studentId);
        replace("className", user.className);
        replace("faculty", user.faculty);
        replace("university", user.university);
        replace("major", reg.major || "");
        replace("email", user.email);
        replace("phone", user.phone);
        if (reg.dob) {
            const d = new Date(reg.dob);
            const dobFormatted = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth()+1)
            .toString().padStart(2, "0")}/${d.getFullYear()}`;
            replace("dob", dobFormatted);
        } else replace("dob", "");

        replace("facebook", reg.facebook);
        replace("address", reg.address);
        replace("bio", reg.bio);
        replace("health", reg.health);

        const oneLine = (txt) => txt ? txt.replace(/\n/g, " ") : "";
        replace("nv1", oneLine(reg.nv1));
        replace("nv2", oneLine(reg.nv2));
        replace("nv3", oneLine(reg.nv3));
        replace("nv4", oneLine(reg.nv4));
        replace("nv5", oneLine(reg.nv5));
        replace("nv6", oneLine(reg.nv6));

        // ==========================
        // Tick GIỚI TÍNH
        // ==========================
        replace("gender_male", checkBox(reg.gender, "Nam"));
        replace("gender_female", checkBox(reg.gender, "Nữ"));
        replace("gender_other", checkBox(reg.gender, "Khác"));

        // ==========================
        // Tick PHƯƠNG TIỆN
        // ==========================
        replace("vehicle_50", checkBox(reg.vehicle, "Xe máy 50cc"));
        replace("vehicle_100", checkBox(reg.vehicle, "Xe máy trên 50cc"));
        replace("vehicle_none", checkBox(reg.vehicle, "Không"));

        // ==========================
        // Tick BẰNG LÁI
        // ==========================
        replace("license_yes", checkBox(reg.license, "Có"));
        replace("license_no", checkBox(reg.license, "Không"));

        // ==========================
        // Tick THỰC TẬP HÓA ĐẠI CƯƠNG
        // ==========================
        replace("lab_yes", checkBox(reg.lab, "Đã học"));
        replace("lab_no", checkBox(reg.lab, "Chưa học"));

        // ==========================
        // Tick CDTN
        // ==========================
        replace("cdtn_yes", checkBox(reg.cdtn, "Đã từng"));
        replace("cdtn_no", checkBox(reg.cdtn, "Chưa từng"));

        // ==========================
        // Tick SIZE ÁO
        // ==========================
        const sizes = ["S", "M", "L", "XL", "XXL", "XXXL"];
        sizes.forEach(size => {
            replace("size_" + size, checkBox(reg.size, size));
        });

        // ==========================
        // Tick KỸ NĂNG
        // ==========================
        const skillMap = {
            "Dẫn chương trình": "skill_mc",
            "Hoạt náo": "skill_hoatnao",
            "Thực hiện các thí nghiệm": "skill_thinghiem",
            "Gói bánh chưng, bánh tét": "skill_goibanh",
            "Vẽ tường": "skill_vetuong",
            "Trang trí, làm đồ handmade": "skill_handmade",
            "Văn nghệ (VD: hát, nhảy, đạo diễn tiết mục, sử dụng nhạc cụ)": "skill_vannghe"
        };

        Object.entries(skillMap).forEach(([label, key]) => {
            replace(key, reg.skills?.includes(label) ? "checked" : "");
        });


        // ====== TÍNH STT ======
        const countBefore = await Registration.countDocuments({
            createdAt: { $lt: reg.createdAt }
        });
        const STT = countBefore + 1;

        // ====== NGÀY THÁNG NĂM ======
        const created = new Date(reg.createdAt);
        const day = created.getDate();
        const month = created.getMonth() + 1;
        const year = created.getFullYear();

        // ====== REPLACE ======
        replace("STT", STT);
        replace("day", day);
        replace("month", month);
        replace("year", year);

        // ==========================
        // GENERATE PDF
        // ==========================
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: ["load", "domcontentloaded", "networkidle0"] });
        await page.evaluateHandle("document.fonts.ready");


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

router.put("/interview/:regId", auth, admin, async (req, res) => {
  try {
    const { interviewNote, interviewResult, interviewer } = req.body;

    if (!interviewer)
      return res.status(400).json({ msg: "Vui lòng chọn người phỏng vấn!" });

    const reg = await Registration.findByIdAndUpdate(
      req.params.regId,
      { interviewNote, interviewResult, interviewer },
      { new: true }
    );

    if (!reg) return res.status(404).json({ msg: "Không tìm thấy đăng ký" });

    res.json({ msg: "Đã cập nhật phỏng vấn" });

  } catch (err) {
    res.status(500).json({ msg: "Lỗi cập nhật phỏng vấn" });
  }
});



module.exports = router;
