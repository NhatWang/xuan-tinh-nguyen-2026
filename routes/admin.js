const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Registration = require("../models/Registration");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const feedbackCtrl = require("../controllers/feedbackController");
const adminCtrl = require("../controllers/adminController");

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const nvCode = {
    "Đội hình Chồi xuân": "CX",
    "Đội hình Khởi xuân an": "KXA",
    "Đội hình Xuân chiến sĩ": "XCS",
    "Đội hình Xuân gắn kết": "XGK",
    "Đội hình Xuân đất thép": "XĐT",
    "Đội hình Xuân Bác Ái": "XBA"
};

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

/* =====================================================
   GET SINGLE REGISTRATION (FOR ONLINE INTERVIEW ROOM)
   GET /api/admin/registration/:regId
===================================================== */
router.get(
  "/registration/:regId",
  auth,
  admin,
  async (req, res) => {
    try {
      const reg = await Registration
        .findById(req.params.regId)
        .populate("userId");

      if (!reg)
        return res.status(404).json({ msg: "Không tìm thấy hồ sơ" });

      res.json({
        user: reg.userId,
        reg
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Lỗi lấy hồ sơ phỏng vấn" });
    }
  }
);

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

        const mark = (condition) => (condition ? "X" : "");

        // ===========================
        // LOAD FONT → BASE64
        // ===========================
        const fontNormalPath = path.join(process.cwd(), "public", "fonts", "SVN-Times New Roman.ttf");
        const fontBoldPath   = path.join(process.cwd(), "public", "fonts", "SVN-Times New Roman Bold.ttf");

        const fontNormalBase64 = fs.readFileSync(fontNormalPath).toString("base64");
        const fontBoldBase64   = fs.readFileSync(fontBoldPath).toString("base64");

        // Inject vào template
        replace("font_normal_base64", fontNormalBase64);
        replace("font_bold_base64", fontBoldBase64);

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
        replace("gender_male", mark(reg.gender === "Nam"));
        replace("gender_female", mark(reg.gender === "Nữ"));

        // ==========================
        // Tick PHƯƠNG TIỆN
        // ==========================
        replace("vehicle_50", mark(reg.vehicle === "Xe máy 50cc"));
        replace("vehicle_100", mark(reg.vehicle === "Xe máy trên 50cc"));
        replace("vehicle_none", mark(reg.vehicle === "Không"));

        // ==========================
        // Tick BẰNG LÁI
        // ==========================
        replace("license_yes", mark(reg.license === "Có"));
        replace("license_no", mark(reg.license === "Không"));

        // ==========================
        // Tick THỰC TẬP HÓA ĐẠI CƯƠNG
        // ==========================
        replace("lab_yes", mark(reg.lab === "Đã học"));
        replace("lab_no", mark(reg.lab === "Chưa học"));

        // ==========================
        // Tick CDTN
        // ==========================
        replace("cdtn_yes", mark(reg.cdtn === "Đã từng"));
        replace("cdtn_no", mark(reg.cdtn === "Chưa từng"));

        // ==========================
        // Tick SIZE ÁO
        // ==========================
        const sizes = ["S", "M", "L", "XL", "XXL", "XXXL"];
        sizes.forEach(size => {
            replace(`size_${size}`, mark(reg.size === size));
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
            replace(key, mark(reg.skills?.includes(label)));
        });


        // ======================
        // TÍNH STT THEO ĐỘI HÌNH
        // ======================

        // 1) Lấy TẤT CẢ đơn đăng ký và sort theo thời gian tăng dần
        const allRegs = await Registration.find().sort({ createdAt: 1 });

        // 2) Tạo bộ đếm riêng cho từng đội hình
        const counters = {};  // ví dụ: { "Đội hình Chồi xuân": 2, ... }

        // 3) Lặp và gán STT cho từng đơn
        allRegs.forEach(r => {
            const team = r.nv1;                // đội hình dùng để tạo STT
            const code = nvCode[team] || "NA"; // mã viết tắt đội hình

            if (!counters[team]) counters[team] = 1;

            const order = counters[team]++;  // tăng 1
            const sttFormatted = `${code}-${String(order).padStart(2, "0")}`;

            r.stt_code = sttFormatted;
        });

        // 4) Lấy đúng STT của đơn đang export
        const currentReg = allRegs.find(r => r._id.toString() === reg._id.toString());
        const STT = currentReg.stt_code;

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

        // Chuẩn hóa tên file: bỏ dấu + khoảng trắng nguy hiểm
        const safeName = user.fullName
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // bỏ dấu tiếng Việt
        .replace(/[^\w\- ]+/g, "")                          // loại ký tự đặc biệt
        .replace(/ /g, "_");                                // đổi space thành _

        const fileName = `${safeName}.pdf`;

        res.setHeader("Content-Type", "application/pdf");

        // ⭐ Hỗ trợ UTF8 đúng chuẩn cho iOS/Android
        res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
        );

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
        const { interviewNote, interviewResult, interviewer } = req.body;

        if (!interviewer)
            return res.status(400).json({ msg: "Vui lòng nhập tên người phỏng vấn!" });

        // Lấy bản ghi để biết team + ca
        const regOld = await Registration.findById(req.params.regId);
        if (!regOld) return res.status(404).json({ msg: "Không tìm thấy đăng ký" });

        const team = regOld.nv1;
        const ca   = regOld.interviewLocation;

        // ⭐ Data update cơ bản
        let updateData = { interviewNote, interviewResult, interviewer };

        // ⭐ Nếu chuyển sang "Chờ duyệt" → gỡ khỏi hàng đợi
        let needReset = false;

        if (interviewResult === "Chờ duyệt") {
            updateData.attendance = false;
            updateData.interviewOrder = null;
            needReset = true;
        }

        // ⭐ Update chính bản ghi
        const updated = await Registration.findByIdAndUpdate(
            req.params.regId,
            updateData,
            { new: true }
        );

        if (!updated)
            return res.status(404).json({ msg: "Không tìm thấy đăng ký" });

        // =====================================================
        // ⭐ RESET STT khi "Chờ duyệt"
        // =====================================================
        if (needReset) {
            const groupRegs = await Registration.find({
                nv1: team,
                interviewLocation: ca,
                attendance: true
            }).sort({ interviewOrder: 1 });

            // Dồn lại STT từ 1 → n
            for (let i = 0; i < groupRegs.length; i++) {
                groupRegs[i].interviewOrder = i + 1;
                await groupRegs[i].save();
            }
        }

        // =====================================================

        res.json({ msg: "Đã cập nhật phỏng vấn", updated });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi cập nhật phỏng vấn" });
    }
});

/* ============================================================
   4. API: UPDATE ĐIỂM DANH THEO registrationId
   PUT /api/admin/attendance/:regId
============================================================ */

router.put("/attendance/:regId", auth, admin, async (req, res) => {
    try {
        const { attendance } = req.body;

        const reg = await Registration.findById(req.params.regId);
        if (!reg) return res.status(404).json({ msg: "Không tìm thấy đăng ký" });

        // ⭐ GROUP = NV1 + CA
        const team = reg.nv1;
        const ca = reg.interviewLocation;

        // ======================================================
        // CASE 1: TICK → Gán STT mới
        // ======================================================
        if (attendance) {
            const groupRegs = await Registration.find({
                nv1: team,
                interviewLocation: ca,
                attendance: true
            }).sort({ interviewOrder: 1 });

            const nextOrder = groupRegs.length + 1;

            reg.attendance = true;
            reg.interviewOrder = nextOrder;
            await reg.save();

            return res.json({
                msg: "Đã điểm danh",
                order: nextOrder   // ⭐ trả STT về frontend
            });
        }

        // ======================================================
        // CASE 2: BỎ TICK → Xóa STT và RESET cả nhóm
        // ======================================================
        else {
            // 1) Bỏ tick bản ghi hiện tại
            reg.attendance = false;
            reg.interviewOrder = null;
            await reg.save(); // ⭐ Quan trọng: save trước

            // 2) Lấy toàn bộ nhóm còn attendance = true
            const groupRegs = await Registration.find({
                nv1: team,
                interviewLocation: ca,
                attendance: true
            }).sort({ interviewOrder: 1 });

            // 3) Reset lại STT từ 1 → n
            for (let i = 0; i < groupRegs.length; i++) {
                groupRegs[i].interviewOrder = i + 1;
                await groupRegs[i].save();
            }

            return res.json({
                msg: "Đã bỏ điểm danh và cập nhật lại STT",
                order: null   // ⭐ luôn null khi bỏ tick
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Lỗi cập nhật điểm danh" });
    }
});

router.get("/feedback/all", auth, admin, feedbackCtrl.getAllFeedback);

/* =====================================================
   ONLINE INTERVIEW – STEP 2
===================================================== */

// Bắt đầu phỏng vấn online
router.put(
    "/interview/start/:id",
    auth,
    admin,
    adminCtrl.startInterviewOnline
);

// Kết thúc phỏng vấn online
router.put(
    "/interview/end/:id",
    auth,
    admin,
    adminCtrl.endInterviewOnline
);

router.get(
  "/interview/room/:regId",
  auth,
  admin,
  adminCtrl.getInterviewRoom
);

router.put(
    "/registration/:id/location",
    auth,
    admin,
    adminCtrl.updateInterviewLocation
);
module.exports = router;
