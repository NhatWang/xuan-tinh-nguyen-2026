const express = require("express");
const router = express.Router();

const User = require("../models/User");
const MediaRegistration = require("../models/MediaRegistration");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/* ============================================================
   1. ADMIN — LẤY DANH SÁCH ĐỘI HÌNH MEDIA
   GET /api/admin/media/list
============================================================ */
router.get("/list", auth, admin, async (req, res) => {
    try {
        const registrations = await MediaRegistration
            .find()
            .populate("userId")
            .sort({ createdAt: -1 });

        res.json(
            registrations.map(reg => ({
                user: reg.userId,
                reg
            }))
        );

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi lấy danh sách đội hình media" });
    }
});

/* ============================================================
   2. ADMIN — EXPORT PDF HỒ SƠ MEDIA
   GET /api/admin/media/export/:mediaId
============================================================ */
router.get("/export/:mediaId", auth, admin, async (req, res) => {
    try {
        const reg = await MediaRegistration.findById(req.params.mediaId)
            .populate("userId");

        if (!reg)
            return res.status(404).json({ msg: "Không tìm thấy đăng ký Media" });

        const user = reg.userId;

        const templatePath = path.join(__dirname, "../templates/media_template.html");
        let html = fs.readFileSync(templatePath, "utf8");

        const replace = (key, value) => {
            html = html.replace(new RegExp(`{{${key}}}`, "g"), value || "");
        };

        const mark = (condition) => (condition ? "X" : "");

        /* ==========================
           LOAD FONT BASE64
        ========================== */
        const fontNormal = fs.readFileSync(path.join(process.cwd(), "public/fonts/SVN-Times New Roman.ttf")).toString("base64");
        const fontBold   = fs.readFileSync(path.join(process.cwd(), "public/fonts/SVN-Times New Roman Bold.ttf")).toString("base64");

        replace("font_normal_base64", fontNormal);
        replace("font_bold_base64", fontBold);

        /* ==========================
           TEXT FIELDS
        ========================== */
        replace("fullName", user.fullName);
        replace("studentId", user.studentId);
        replace("className", user.className);
        replace("faculty", user.faculty);
        replace("university", user.university);
        replace("email", user.email);
        replace("phone", user.phone);
        replace("facebook", reg.facebook);
        replace("address", reg.address);
        replace("major", reg.major);
        replace("bio", reg.bio);
        replace("health", reg.health);

        if (reg.dob) {
            const d = new Date(reg.dob);
            replace("dob",
                `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
            );
        } else replace("dob", "");

        /* ==========================
           GENDER
        ========================== */
        replace("gender_male", mark(reg.gender === "Nam"));
        replace("gender_female", mark(reg.gender === "Nữ"));

        /* ==========================
           VEHICLE
        ========================== */
        replace("vehicle_50", mark(reg.vehicle === "Xe máy 50cc"));
        replace("vehicle_100", mark(reg.vehicle === "Xe máy trên 50cc"));
        replace("vehicle_none", mark(reg.vehicle === "Không"));

        /* ==========================
           LICENSE
        ========================== */
        replace("license_yes", mark(reg.license === "Có"));
        replace("license_no", mark(reg.license === "Không"));

        /* ==========================
           CDTN YES / NO (MEDIA CÓ FIELD)
        ========================== */
        replace("cdtn_yes", mark(reg.cdtn === "Đã từng"));
        replace("cdtn_no",  mark(reg.cdtn === "Chưa từng"));

        /* ==========================
           ROLE (Tư liệu – Thiết kế – Content)
        ========================== */
        const roleMap = {
            "Tư liệu": "role_tulieu",
            "Thiết kế": "role_thietke",
            "Content": "role_content"
        };

        Object.entries(roleMap).forEach(([label, key]) => {
            replace(key, mark(reg.mediaRoles?.includes(label)));
        });

        /* ==========================
           ĐỊA PHƯƠNG
        ========================== */
        const locationMap = {
            "Đội hình Chồi xuân": "loc_cx",
            "Đội hình Khởi xuân an": "loc_kxa",
            "Đội hình Xuân chiến sĩ": "loc_xcs",
            "Đội hình Xuân gắn kết": "loc_xgk",
            "Đội hình Xuân đất thép": "loc_xdt",
            "Đội hình Xuân Bác Ái": "loc_xba"
        };

        Object.entries(locationMap).forEach(([label, key]) => {
            replace(key, mark(reg.mediaLocations?.includes(label)));
        });

        /* ==========================
           SIZE (CÓ XXXL)
        ========================== */
        ["S", "M", "L", "XL", "XXL", "XXXL"].forEach(size => {
            replace(`size_${size}`, mark(reg.size === size));
        });

        /* ==========================
           STT & DATE
        ========================== */

        // Lấy toàn bộ đơn media, sort theo thời gian tăng
        const allMedia = await MediaRegistration.find().sort({ createdAt: 1 });

        // Tạo STT
        allMedia.forEach((m, index) => {
            m.stt_code = `TT-${String(index + 1).padStart(2, "0")}`;
        });

        // Tìm đúng STT của đơn đang export
        const currentMedia = allMedia.find(m => m._id.toString() === reg._id.toString());

        // STT cuối cùng
        const STT = currentMedia ? currentMedia.stt_code : "TT-00";

        replace("STT", STT);

        const created = new Date(reg.createdAt);
        replace("day", String(created.getDate()).padStart(2,"0"));
        replace("month", String(created.getMonth()+1).padStart(2,"0"));
        replace("year", created.getFullYear());

        /* ==========================
           GENERATE PDF
        ========================== */
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.evaluateHandle("document.fonts.ready");

        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        // Chuẩn hoá tên file
        const safeName = user.fullName
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // bỏ dấu
        .replace(/[^\w\- ]+/g, "")                        // ký tự đặc biệt
        .replace(/ /g, "_");                              // space → underscore

        const fileName = `${safeName}_MEDIA.pdf`;

        res.setHeader("Content-Type", "application/pdf");

        // Hỗ trợ chuẩn UTF-8 trên tất cả trình duyệt
        res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
        );

        res.send(pdf);


    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi xuất PDF Media" });
    }
});

/* ============================================================
   3. ADMIN — LƯU PHỎNG VẤN MEDIA
   PUT /api/admin/media/interview/:id
============================================================ */
router.put("/interview/:id", auth, admin, async (req, res) => {
    try {
        const { interviewNote, interviewResult, interviewer } = req.body;

        if (!interviewResult)
            return res.status(400).json({ msg: "Thiếu kết quả phỏng vấn" });

        if (!interviewer)
            return res.status(400).json({ msg: "Vui lòng nhập tên người phỏng vấn!" });

        const updated = await MediaRegistration.findByIdAndUpdate(
            req.params.id,
            { interviewNote, interviewResult, interviewer },
            { new: true }
        );

        if (!updated)
            return res.status(404).json({ msg: "Không tìm thấy đăng ký Media" });

        res.json({ msg: "Đã cập nhật phỏng vấn Media", updated });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi cập nhật phỏng vấn Media" });
    }
});

module.exports = router;
