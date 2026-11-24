const API = "/api";

let currentResultId = null;
let currentResultNote = "";
let currentResultInterviewer = "";

const socket = io({
    withCredentials: true
});

function safeLower(text) {
    return (text || "").toString().toLowerCase();
}

/* =====================================================
   REALTIME – INTERVIEW STATUS (ADMIN)
===================================================== */

socket.on("interview:calling", data => {
    const item = allUsers.find(u => u.reg._id === data.regId);
    if (!item) return;

    item.reg.interviewStatus = "calling";
    item.reg.interviewRoomId = data.roomUrl || item.reg.interviewRoomId;

    refreshOnlineTableIfOpen();
});

socket.on("interview:ended", data => {
    const item = allUsers.find(u => u.reg._id === data?.regId);
    if (!item) return;

    item.reg.interviewStatus = "ended";
    item.reg.interviewRoomId = null;

    refreshOnlineTableIfOpen();
});

/* =====================================================
   HELPER
===================================================== */
function refreshOnlineTableIfOpen() {
    const onlineTable = document.getElementById("onlineInterviewTable");
    if (!onlineTable || onlineTable.style.display !== "table") return;

    const onlineUsers = allUsers.filter(
        u => u.reg.interviewLocation === "Khác"
    );

    renderOnlineInterviewTable(onlineUsers);
}


/* =====================================================
   UTILITIES
===================================================== */
const shortName = (full) => {
    const map = {
        "Đội hình Chồi xuân": "CX",
        "Đội hình Khởi xuân an": "KXA",
        "Đội hình Xuân chiến sĩ": "XCS",
        "Đội hình Xuân gắn kết": "XGK",
        "Đội hình Xuân đất thép": "XĐT",
        "Đội hình Xuân Bác Ái": "XBA",
        "Không": "—",
        "": "—",
        null: "—",
        undefined: "—"
    };
    return map[full] || "—";
};

function safe(text) {
    return text?.replace(/[&<>"]/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
    })[c]) || "";
}

const ADMIN_AVATARS = {
    // Admin đăng ký thủ công (có email)
    "lchhh.hcmus@gmail.com": "/avatars/lch.png",
    "hoahoc.kttt@gmail.com": "/avatars/chemme.jpg",
    "dsvtn.hh.khtn@gmail.com": "/avatars/svtn.jpg",
    // Admin đăng nhập qua SV5T (có username, không có email)
    "lch_admin": "/avatars/lch.png"
};

function loadAdminAvatar(user) {
    const img = document.getElementById("adminAvatar");
    if (!img) return;
    img.src = ADMIN_AVATARS[user.email] || ADMIN_AVATARS[user.username] || "/avatars/default.jpg";
}

/* =====================================================
   TOAST UI
===================================================== */
function showToast(message, type = "success") {
    const box = document.getElementById("toast");
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.innerHTML = `<i>${type === "success" ? "✔" : "✖"}</i> ${message}`;

    box.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

/* =====================================================
   CHECK ADMIN
===================================================== */
async function checkAdmin() {
    try {
        const res = await fetch(API + "/auth/me", { credentials: "include" });

        if (!res.ok) {
            showToast("Bạn chưa đăng nhập!", "warning");
            window.location.href = "/";
            return false;
        }

        const user = await res.json();

        if (user.role !== "admin") {
            showToast("Bạn không có quyền truy cập!", "error");
            window.location.href = "dashboard.html";
            return false;
        }

        document.getElementById("adminName").textContent = user.fullName;
        document.getElementById("adminEmail").textContent = user.email || user.username || "";
        loadAdminAvatar(user);
        return true;

    } catch (err) {
        showToast("Không thể kết nối server!", "error");
        return false;
    }
}

/* =====================================================
   LOAD REGISTRATION LIST
===================================================== */
let allUsers = [];

async function loadUsers() {
    document.getElementById("pageTitle").textContent = "Danh sách đăng ký đội hình Chuyên môn và địa phương";
    document.getElementById("userTable").style.display = "table";
    document.getElementById("mediaTable").style.display = "none";
    document.getElementById("mediaFilterRow").style.display = "none";
    document.getElementById("mediaTotalRow").style.display = "none";
    document.getElementById("filterNV").parentElement.style.display = "flex";
    document.getElementById("filterStatus").parentElement.style.display = "flex";
    document.getElementById("filterCaRow").style.display = "flex";
    document.getElementById("totalRegRow").style.display = "flex";
    document.getElementById("onlineInterviewTable").style.display = "none";
    document.getElementById("searchText").value = "";


    try {
        const res = await fetch(API + "/admin/list", { credentials: "include" });

        if (!res.ok) {
            showToast("Không thể tải danh sách!", "error");
            return;
        }

        allUsers = await res.json();
        updateTotalReg(allUsers);
        renderUserTable(allUsers);

    } catch (err) {
        showToast("Không thể kết nối server!", "error");
    }
}

function renderUserTable(list) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    list.forEach(item => {
        if (!item.user || !item.user.fullName) {
        console.warn("⚠️ Bỏ qua record lỗi:", item);
        return;
    }
        const u = item.user;
        const r = item.reg;

        const isNotInterviewed = !r.interviewResult || r.interviewResult === "Chưa phỏng vấn";
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", r._id);

        tr.innerHTML = `
            <td>${safe(u.fullName)}</td>
            <td>${safe(u.studentId)}</td>
            <td>${safe(u.email)}</td>
            <td>${safe(u.phone || "—")}</td>

            <td>${shortName(r.nv1)}</td>
            <td>${shortName(r.nv2)}</td>
            <td>${shortName(r.nv3)}</td>
            <td>${shortName(r.nv4)}</td>
            <td>${shortName(r.nv5)}</td>
            <td>${shortName(r.nv6)}</td>

            <td><a href="${r.facebook}" target="_blank">${safe(u.fullName)}</a></td>
            <td>
                <select class="inline-select"
                    onchange="updateInterviewLocation('${r._id}', this.value)"
                >
                    <option value="">—</option>
                    <option value="Ca 1" ${r.interviewLocation==="Ca 1"?"selected":""}>Ca 1</option>
                    <option value="Ca 2" ${r.interviewLocation==="Ca 2"?"selected":""}>Ca 2</option>
                    <option value="Ca 3" ${r.interviewLocation==="Ca 3"?"selected":""}>Ca 3</option>
                    <option value="Ca 4" ${r.interviewLocation==="Ca 4"?"selected":""}>Ca 4</option>
                    <option value="Khác" ${r.interviewLocation==="Khác"?"selected":""}>Khác</option>
                </select>
            </td>
            <td>${safe(r.interviewResult || "Chưa phỏng vấn")}</td>

            <td>
                <div class="btn-row">
                    <button class="btn-preview" onclick="previewPDF('${r._id}')">Xem trước</button>
                    <button class="btn-download" onclick="downloadPDF('${r._id}', '${safe(u.fullName)}')">Tải xuống</button>
                </div>
            </td>
            <td>
                <input 
                    type="checkbox" 
                    ${r.attendance ? "checked" : ""} 
                    onclick="toggleAttendance('${r._id}', this.checked)"
                >
            </td>

            <td>${r.interviewOrder || "—"}</td>
            <td>
                ${
                    isNotInterviewed
                    ? `<button class="action-btn"
                            onclick='openInterviewModal(
                            "${r._id}",
                            ${JSON.stringify(r.interviewNote || "")},
                            "",
                            ${JSON.stringify(r.interviewer || "")}
                        )'>
                            Phỏng vấn
                       </button>`
                    : `<button class="action-btn"
                            onclick='openResultModal(
                            "${r._id}",
                            ${JSON.stringify(u.fullName)},
                            ${JSON.stringify(r.interviewResult)},
                            ${JSON.stringify(r.interviewNote)},
                            ${JSON.stringify(r.interviewer)}
                        )'>
                            Kết quả
                       </button>`
                }
            </td>

            <td>${safe(r.interviewer || "—")}</td>
            <td>
                ${
                    (!r.interviewNote || r.interviewNote.trim() === "")
                    ? "—"
                    : `<button class="note-btn" onclick="openNoteModal(decodeURIComponent('${encodeURIComponent(r.interviewNote)}'))">Ghi chú</button>`
                }
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/* =====================================================
   FILTER REGISTRATION
===================================================== */
function filterUsers() {
    const text = document.getElementById("searchText").value.trim().toLowerCase();
    const nvFilter = document.getElementById("filterNV").value;
    const statusFilter = document.getElementById("filterStatus").value;
    const caFilter = document.getElementById("filterCa").value;

    let filtered = [...allUsers];

    if (text) {
    filtered = filtered.filter(u =>
        u.user &&
        (
            safeLower(u.user.fullName).includes(text) ||
            safeLower(u.user.studentId).includes(text)
        )
    );
}

    if (nvFilter) {
        filtered = filtered.filter(u =>
            shortName(u.reg.nv1) === shortName(nvFilter)
        );
    }

    if (caFilter)
        filtered = filtered.filter(u => u.reg.interviewLocation === caFilter);

    if (statusFilter) {

    // 1) Chưa phỏng vấn = interviewResult null hoặc ""
    if (statusFilter === "Chưa phỏng vấn") {
        filtered = filtered.filter(u => !u.reg.interviewResult);
    }

    // 2) Chờ duyệt
    else if (statusFilter === "Chờ duyệt") {
        filtered = filtered.filter(u => u.reg.interviewResult === "Chờ duyệt");
    }

    // 3) Không đạt / Rớt
    else if (statusFilter === "Không đạt") {
        filtered = filtered.filter(u => u.reg.interviewResult === "Không đạt");
    }

    // 4) Các trường hợp Đậu NV1 → NV6
    else if (statusFilter.startsWith("Đậu NV")) {
        filtered = filtered.filter(u => u.reg.interviewResult === statusFilter);
    }
}

    updateTotalReg(filtered);
    renderUserTable(filtered);
}

/* =====================================================
   PDF EXPORT
===================================================== */
async function previewPDF(id) {
    try {
        const res = await fetch(API + `/admin/export/${id}`, { credentials: "include" });
        if (!res.ok) return showToast("Không thể tạo PDF!", "error");

        const blob = await res.blob();
        document.getElementById("pdfFrame").src = URL.createObjectURL(blob);
        document.getElementById("pdfModal").style.display = "flex";

    } catch {
        showToast("Lỗi xem PDF!", "error");
    }
}

async function downloadPDF(id, fullName) {
    try {
        const res = await fetch(API + `/admin/export/${id}`, { credentials: "include" });
        if (!res.ok) return showToast("Không thể tải PDF!", "error");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${fullName}.pdf`;
        a.click();

        URL.revokeObjectURL(url);

    } catch {
        showToast("Lỗi tải PDF!", "error");
    }
}

function closePDFModal() {
    document.getElementById("pdfModal").style.display = "none";
    document.getElementById("pdfFrame").src = "";
}

/* =====================================================
   RESULT MODAL
===================================================== */
function openResultModal(id, fullName, result, note, interviewer) {
    currentResultId = id;

    // Lưu lại note + interviewer để gửi vào backend
    currentResultNote = note || "";
    currentResultInterviewer = interviewer || "";

    // Set title modal
    document.getElementById("resultModalTitle").textContent =
        "Kết quả của " + fullName;

    // Hiển thị đúng kết quả hiện tại
    document.getElementById("finalResult").value = result || "Không đạt";

    document.getElementById("resultModal").style.display = "flex";
}

async function saveFinalResult() {
    const result = document.getElementById("finalResult").value;

    try {
        const res = await fetch(API + `/admin/interview/${currentResultId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                interviewNote: currentResultNote,        // giữ nguyên ghi chú
                interviewResult: result,                // ⭐ GỬI NGUYÊN "Đậu nguyện vọng 1"
                interviewer: currentResultInterviewer   // giữ nguyên người PV
            })
        });

        if (!res.ok) return showToast("Lưu thất bại!", "error");

        showToast("Đã lưu kết quả!", "success");
        closeResultModal();
        const item = allUsers.find(u => u.reg._id === currentResultId);
        item.reg.interviewResult = result;
        item.reg.interviewer = currentResultInterviewer;

        renderUserTable(allUsers);

    } catch {
        showToast("Lỗi kết nối server!", "error");
    }
}


function closeResultModal() {
    document.getElementById("resultModal").style.display = "none";
}

/* =====================================================
   INTERVIEW MODAL
===================================================== */
let currentRegId = null;

function openInterviewModal(id, note, result, interviewer) {
    currentRegId = id;

    document.getElementById("interviewNote").value = note || "";
    document.getElementById("interviewer").value = interviewer || "";

    // checkbox chờ duyệt
    document.getElementById("interviewPending").checked = (result === "Chờ duyệt");

    document.querySelector("#interviewModal .save-btn").onclick = saveInterview;

    document.getElementById("interviewModal").style.display = "flex";
}

function closeInterviewModal() {
    document.getElementById("interviewModal").style.display = "none";
}

async function saveInterview() {
    const note = document.getElementById("interviewNote").value;
    const interviewer = document.getElementById("interviewer").value.trim();

    if (!interviewer) return showToast("Vui lòng nhập tên người phỏng vấn!", "warning");

    const result = document.getElementById("interviewPending").checked
    ? "Chờ duyệt"
    : "";

    try {
        const res = await fetch(API + `/admin/interview/${currentRegId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ interviewNote: note, interviewResult: result, interviewer })
        });

        if (!res.ok) return showToast("Lưu thất bại!", "error");

        showToast("Đã lưu phỏng vấn!", "success");
        closeInterviewModal();
        // cập nhật local object
        const item = allUsers.find(u => u.reg._id === currentRegId);
        item.reg.interviewNote = note;
        item.reg.interviewResult = result;
        item.reg.interviewer = interviewer;

        // cập nhật UI cho dòng đó
        renderUserTable(allUsers);

    } catch {
        showToast("Lỗi kết nối server!", "error");
    }
}

function openNoteModal(note) {
    document.getElementById("noteText").textContent = note;
    document.getElementById("noteModal").style.display = "flex";
}

function closeNoteModal() {
    document.getElementById("noteModal").style.display = "none";
}

/* =====================================================
   GLOBAL STATE FOR COUNT DISPLAY
===================================================== */
function updateTotalReg(list) {
    document.getElementById("totalReg").textContent = list.length;
}

function updateTotalMedia(list) {
    document.getElementById("totalMedia").textContent = list.length;
}

/* =====================================================
   MEDIA TEAM
===================================================== */
let allMedia = [];

async function loadMediaList() {
    document.getElementById("pageTitle").textContent = "Danh sách đăng ký đội hình Truyền thông";

    document.getElementById("userTable").style.display = "none";
    document.getElementById("mediaTable").style.display = "table";
    document.getElementById("mediaFilterRow").style.display = "flex";
    document.getElementById("filterNV").parentElement.style.display = "none";
    document.getElementById("filterStatus").parentElement.style.display = "none";
    document.getElementById("filterCaRow").style.display = "none";
    document.getElementById("totalRegRow").style.display = "none";
    document.getElementById("mediaFilterRow").style.display = "flex";
    document.getElementById("mediaTotalRow").style.display = "flex";
    document.getElementById("onlineInterviewTable").style.display = "none";


    try {
        const res = await fetch(API + "/admin/media/list", { credentials: "include" });
        if (!res.ok) return showToast("Không thể tải danh sách đội hình!", "error");

        allMedia = await res.json();
        updateTotalMedia(allMedia);
        renderMediaTable(allMedia);

    } catch {
        showToast("Không thể kết nối server!", "error");
    }
}

function renderMediaTable(list) {
    const tbody = document.getElementById("mediaTableBody");
    tbody.innerHTML = "";

    list.forEach(item => {
        const u = item.user;
        const r = item.reg;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${safe(u.fullName)}</td>
            <td>${safe(u.studentId)}</td>
            <td>${safe(u.email)}</td>
            <td>${safe(u.phone || "—")}</td>

            <td>${(r.mediaRoles || []).join(", ")}</td>
            <td>${(r.mediaLocations || []).join(", ")}</td>

            <td><a href="${r.facebook}" target="_blank">${safe(u.fullName)}</a></td>

            <td>${safe(r.interviewResult || "Chưa phỏng vấn")}</td>

            <td>
                <div class="btn-row">
                    <button class="btn-preview" onclick="previewMediaPDF('${r._id}')">Xem trước</button>
                    <button class="btn-download" onclick="downloadMediaPDF('${r._id}', '${safe(u.fullName)}')">Tải xuống</button>
                </div>
            </td>

            <td>
                <button class="action-btn"
                    onclick='openMediaInterviewModal(
                        "${r._id}",
                        ${JSON.stringify(r.interviewNote || "")},
                        ${JSON.stringify(r.interviewResult || "")},
                        ${JSON.stringify(r.interviewer || "")}
                    )'>
                    Phỏng vấn
                </button>
            </td>

            <td>${safe(r.interviewer || "—")}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =====================================================
   MEDIA PDF
===================================================== */
async function previewMediaPDF(id) {
    try {
        const res = await fetch(API + `/admin/media/export/${id}`, { credentials: "include" });
        if (!res.ok) return showToast("Không thể tạo PDF!", "error");

        const blob = await res.blob();
        document.getElementById("pdfFrame").src = URL.createObjectURL(blob);
        document.getElementById("pdfModal").style.display = "flex";

    } catch {
        showToast("Lỗi khi mở PDF!", "error");
    }
}

async function downloadMediaPDF(id, fullName) {
    try {
        const res = await fetch(API + `/admin/media/export/${id}`, { credentials: "include" });
        if (!res.ok) return showToast("Không thể tải PDF!", "error");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${fullName}_MEDIA.pdf`;
        a.click();

        URL.revokeObjectURL(url);

    } catch {
        showToast("Lỗi tải file PDF!", "error");
    }
}

/* =====================================================
   MEDIA INTERVIEW
===================================================== */
let currentMediaRegId = null;

function openMediaInterviewModal(id, note, result, interviewer) {
    currentMediaRegId = id;

    document.getElementById("mediaInterviewNote").value = note || "";
    document.getElementById("mediaInterviewResult").value = result || "";
    document.getElementById("mediaInterviewer").value = interviewer || "";

    document.getElementById("mediaInterviewModal").style.display = "flex";
}

async function saveMediaInterview() {
    const note = document.getElementById("mediaInterviewNote").value;
    const result = document.getElementById("mediaInterviewResult").value;
    const interviewer = document.getElementById("mediaInterviewer").value.trim();

    if (!interviewer)
        return showToast("Vui lòng nhập người phỏng vấn!", "warning");

    try {
        const res = await fetch(API + `/admin/media/interview/${currentMediaRegId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                interviewNote: note,
                interviewResult: result,
                interviewer
            })
        });

        if (!res.ok) return showToast("Lưu thất bại!", "error");

        showToast("Đã lưu phỏng vấn!", "success");
        closeMediaInterviewModal();
        loadMediaList();

    } catch {
        showToast("Không thể kết nối server!", "error");
    }
}


function closeMediaInterviewModal() {
    document.getElementById("mediaInterviewModal").style.display = "none";
}

function filterMedia() {
    const status = document.getElementById("mediaFilterStatus").value;

    let filtered = [...allMedia];

    // chưa phỏng vấn = r.interviewResult null hoặc ""
    if (status === "Chưa phỏng vấn") {
        filtered = filtered.filter(i => !i.reg.interviewResult);
    }
    else if (status) {
        filtered = filtered.filter(i => i.reg.interviewResult === status);
    }

    updateTotalMedia(filtered);
    renderMediaTable(filtered);
}

/* =====================================================
   ATTENDANCE + INTERVIEW ORDER FIXED VERSION
===================================================== */

async function toggleAttendance(id, checked) {
    try {
        const res = await fetch(API + `/admin/attendance/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ attendance: checked })
        });

        if (!res.ok) return showToast("Lỗi cập nhật điểm danh!", "error");

        const data = await res.json();
        showToast(data.msg, "success");

        // 1️⃣ Cập nhật local cho user hiện tại
        updateLocalAttendance(id, checked, data.order);

        // 2️⃣ Lấy user hiện tại để biết nhóm
        const current = allUsers.find(u => u.reg._id === id);

        // 3️⃣ Cập nhật lại toàn bộ STT nhóm
        refreshGroupOrders(current.reg.nv1, current.reg.interviewLocation);

        // 4️⃣ Nếu đang filter → cập nhật bảng theo filter
        if (document.getElementById("searchText").value ||
            document.getElementById("filterNV").value ||
            document.getElementById("filterStatus").value ||
            document.getElementById("filterCa").value) {

            filterUsers();
        }

    } catch {
        showToast("Không thể kết nối server!", "error");
    }
}

/* =====================================================
   RESET STT CHO TOÀN BỘ NHÓM (FIXED)
===================================================== */
function refreshGroupOrders(team, ca) {
    const group = allUsers.filter(u =>
        u.reg.nv1 === team &&
        u.reg.interviewLocation === ca &&
        u.reg.attendance
    );

    // Sort theo STT backend trả về, nếu null → cho xuống cuối
    group.sort((a, b) =>
        (a.reg.interviewOrder || 9999) - (b.reg.interviewOrder || 9999)
    );

    // 1️⃣ Reset thứ tự lại từ 1 → n trong allUsers
    group.forEach((item, index) => {
        item.reg.interviewOrder = index + 1;
        updateSingleRow(item.reg._id);   // cập nhật UI
    });
}

/* =====================================================
   CẬP NHẬT 1 USER SAU KHI TICK / UNTICK
===================================================== */
function updateLocalAttendance(id, checked, newOrder) {
    const item = allUsers.find(u => u.reg._id === id);
    if (!item) return;

    item.reg.attendance = checked;

    if (checked) {
        item.reg.interviewOrder = newOrder; // ghi STT từ backend
    } else {
        item.reg.interviewOrder = null;
    }

    updateSingleRow(id);
}

/* =====================================================
   UPDATE 1 ROW TRONG BẢNG UI
===================================================== */
function updateSingleRow(id) {
    const allRows = document.querySelectorAll("#tableBody tr");

    allRows.forEach(row => {
        const rowId = row.getAttribute("data-id");
        if (rowId !== id) return;

        const item = allUsers.find(u => u.reg._id === id);
        if (!item) return;

        const tds = row.querySelectorAll("td");

        // Cột checkbox attendance (index 13)
        tds[13].innerHTML = `
            <input type="checkbox" 
            ${item.reg.attendance ? "checked" : ""} 
            onclick="toggleAttendance('${id}', this.checked)">
        `;

        // Cột STT phỏng vấn (index 14)
        tds[14].textContent = item.reg.interviewOrder || "—";
    });
}

function goToTracker() {
    window.open("/tracker.html", "_blank"); // mở tab mới
}

async function openFeedbackList() {
    try {
        const res = await fetch(API + "/admin/feedback/all", {
            credentials: "include"
        });

        if (!res.ok) {
            showToast("Không thể tải feedback!", "error");
            return;
        }

        const data = await res.json();
        const tbody = document.getElementById("feedbackListBody");
        tbody.innerHTML = "";

        // ⭐ Tính điểm trung bình
        let total = data.length;
        let totalStars = data.reduce((sum, fb) => sum + fb.rating, 0);
        let avg = total > 0 ? (totalStars / total).toFixed(1) : "0.0";

        document.getElementById("avgRating").textContent = avg;
        document.getElementById("totalFeedback").textContent = total;
        renderRatingBars(data);

        // ⭐ Render table
        data.forEach(fb => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="padding:10px; border-bottom:1px solid #eee;">${safe(fb.fullName)}</td>
                <td style="padding:10px; border-bottom:1px solid #eee;">${fb.rating} ⭐</td>
                <td style="padding:10px; border-bottom:1px solid #eee;">${safe(fb.feedback || "—")}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("feedbackListModal").style.display = "flex";

    } catch {
        showToast("Không thể kết nối server!", "error");
    }
}

function closeFeedbackList() {
    document.getElementById("feedbackListModal").style.display = "none";
}

function renderRatingBars(feedbackList) {
    const ratingBars = document.getElementById("ratingBars");
    ratingBars.innerHTML = "";

    const total = feedbackList.length;

    // Đếm số người đánh từng số sao
    let counts = { 5:0, 4:0, 3:0, 2:0, 1:0 };

    feedbackList.forEach(fb => {
        let rounded = Math.round(fb.rating); // nếu có 4.5 sao → làm tròn thành 5
        if (rounded < 1) rounded = 1;
        if (rounded > 5) rounded = 5;
        counts[rounded]++;
    });

    // Tạo row 5 → 1 sao
    for (let star = 5; star >= 1; star--) {
        const count = counts[star];
        const percent = total > 0 ? (count / total) * 100 : 0;

        const row = document.createElement("div");
        row.className = "rating-row";

        row.innerHTML = `
            <div class="rating-label">${star} ⭐</div>
            <div class="rating-progress">
                <div class="rating-fill" style="width:${percent}%;"></div>
            </div>
            <div class="rating-count">${count}</div>
        `;

        ratingBars.appendChild(row);
    }
}

async function loadOnlineInterviewList() {
    document.getElementById("pageTitle").textContent = "Danh sách Phỏng vấn Online";

    document.getElementById("searchText").value = "";
    document.getElementById("filterNV").value = "";
    // Ẩn các bảng khác
    document.getElementById("userTable").style.display = "none";
    document.getElementById("mediaTable").style.display = "none";
    document.getElementById("onlineInterviewTable").style.display = "table";

    // Ẩn filter không cần
    document.getElementById("mediaFilterRow").style.display = "none";
    document.getElementById("mediaTotalRow").style.display = "none";
    document.getElementById("filterStatus").parentElement.style.display = "none";
    document.getElementById("filterCaRow").style.display = "none";
    document.getElementById("totalRegRow").style.display = "none";

    // Nếu chưa load users thì load
    if (allUsers.length === 0) {
        const res = await fetch(API + "/admin/list", { credentials: "include" });
        allUsers = await res.json();
    }

    const onlineUsers = allUsers.filter(
        u => u.reg.interviewLocation === "Khác"
    );

    renderOnlineInterviewTable(onlineUsers);
}

function renderOnlineInterviewTable(list) {
    const tbody = document.getElementById("onlineInterviewBody");
    tbody.innerHTML = "";

    list.forEach(item => {
        const u = item.user;
        const r = item.reg;

        // ⭐ XÁC ĐỊNH ĐỘI HÌNH
        let teamLabel = "—";

        if (r.nv1) {
            teamLabel = shortName(r.nv1); // CX, KXA, XCS...
        } 
        else if (r.mediaRoles || r.mediaLocations) {
            teamLabel = "Truyền thông";
        }

        const tr = document.createElement("tr");
        const disabled = r.interviewStatus === "ended" ? "disabled" : "";

        tr.innerHTML = `
            <td>${safe(u.fullName)}</td>
            <td>${safe(u.studentId)}</td>
            <td>${safe(u.email)}</td>
            <td>${safe(r.interviewLocation)}</td>

            <!-- ⭐ CỘT ĐỘI HÌNH (THAY NGƯỜI PHỎNG VẤN) -->
            <td><strong>${teamLabel}</strong></td>

            <td>${renderStatus(r.interviewStatus)}</td>  
            <td>
                <button class="action-btn" ${disabled}
                    onclick="openOnlineInterviewRoom('${r._id}')"
                >Phỏng vấn online
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


function openOnlineInterviewRoom(regId) {

    window.open(
    `/online-interview-room.html?reg=${regId}`,
    "_blank"
    );
}

/* =====================================================
   REALTIME – ONLINE INTERVIEW STATUS
===================================================== */

function renderStatus(status) {
    const map = {
        idle: "⚪ Chưa gán",
        waiting: "🟡 Đã gán phòng",
        calling: "🟢 Đang phỏng vấn",
        ended: "🔴 Đã kết thúc"
    };
    return map[status] || "⚪ Chưa gán";
}

async function updateInterviewLocation(regId, newLocation) {
    try {
        const res = await fetch(
            API + `/admin/registration/${regId}/location`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ interviewLocation: newLocation })
            }
        );

        if (!res.ok) {
            showToast("Cập nhật ca thất bại!", "error");
            return;
        }

        const item = allUsers.find(u => u.reg._id === regId);
        if (!item) return;

        item.reg.interviewLocation = newLocation;
        item.reg.attendance = false;
        item.reg.interviewOrder = null;

        updateRowAfterLocationChange(regId);

        showToast("Đã cập nhật ca phỏng vấn", "success");

    } catch {
        showToast("Lỗi kết nối server!", "error");
    }
}

function updateRowAfterLocationChange(regId) {
    const rows = document.querySelectorAll("#tableBody tr");

    rows.forEach(row => {
        if (row.getAttribute("data-id") !== regId) return;

        const item = allUsers.find(u => u.reg._id === regId);
        if (!item) return;

        const tds = row.querySelectorAll("td");

        // 🔁 CỘT CA PHỎNG VẤN (index 11)
        const select = tds[11].querySelector("select");
        if (select) {
            select.value = item.reg.interviewLocation || "";
        }

        // 🔁 CỘT ĐIỂM DANH (index 14)
        tds[14].innerHTML = `
            <input type="checkbox"
                ${item.reg.attendance ? "checked" : ""}
                onclick="toggleAttendance('${regId}', this.checked)">
        `;

        // 🔁 CỘT STT (index 15)
        tds[15].textContent = "—";
    });
}

function filterOnlineInterview() {
    const text = document
        .getElementById("searchText")
        .value
        .trim()
        .toLowerCase();

    // chỉ lấy user phỏng vấn online
    let onlineUsers = allUsers.filter(
        u => u.reg.interviewLocation === "Khác"
    );

    if (text) {
        onlineUsers = onlineUsers.filter(u =>
    u.user &&
    (
        safeLower(u.user.fullName).includes(text) ||
        safeLower(u.user.studentId).includes(text)
    )
);
    }

    renderOnlineInterviewTable(onlineUsers);
}

function handleOnlineSearch() {
    const onlineTable = document.getElementById("onlineInterviewTable");

    if (onlineTable && onlineTable.style.display === "table") {
        filterOnlineByNVAndName();
    } else {
        filterUsers();
    }
}

function filterOnlineByNVAndName() {
    const nvFilter = document.getElementById("filterNV").value;
    const text = document
        .getElementById("searchText")
        .value
        .trim()
        .toLowerCase();

    // chỉ lấy danh sách online
    let result = allUsers.filter(
        u => u.reg.interviewLocation === "Khác"
    );

    // 🔹 lọc theo NV1
    if (nvFilter) {
        result = result.filter(u =>
            shortName(u.reg.nv1) === shortName(nvFilter)
        );
    }

    // 🔹 lọc theo tên hoặc MSSV
    if (text) {
        result = result.filter(u =>
    u.user &&
    (
        safeLower(u.user.fullName).includes(text) ||
        safeLower(u.user.studentId).includes(text)
    )
);
    }

    renderOnlineInterviewTable(result);
}

function handleOnlineNVFilter() {
    const onlineTable = document.getElementById("onlineInterviewTable");

    if (onlineTable && onlineTable.style.display === "table") {
        filterOnlineByNVAndName();
    } else {
        filterUsers();
    }
}

async function loadPhotoTab() {
    // UI toggle
    document.getElementById("pageTitle").textContent = "Ảnh thẻ 3x4";
    document.getElementById("userTable").style.display = "none";
    document.getElementById("mediaTable").style.display = "none";
    document.getElementById("onlineInterviewTable").style.display = "none";
    document.getElementById("photoTable").style.display = "table";
    document.getElementById("photoActionBar").style.display = "block";

    document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");

    try {
        const res = await fetch("/api/admin/photos", {
            credentials: "include"
        });

        if (!res.ok) {
            showToast("Không thể tải danh sách ảnh!", "error");
            return;
        }

        const list = await res.json();
        renderPhotoTable(list);

    } catch {
        showToast("Lỗi kết nối server!", "error");
    }
}

function renderPhotoTable(list) {
    const tbody = document.getElementById("photoTableBody");
    tbody.innerHTML = "";

    list.forEach(u => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${safe(u.fullName)}</td>
            <td>${safe(u.studentId)}</td>
            <td>
                <img src="${u.photo3x4}" 
                     style="width:45px;height:60px;object-fit:cover;border-radius:4px;">
            </td>
            <td>
                <button class="action-btn" onclick="openPhotoModal('${u.photo3x4}')">
                    Xem
                </button>
            </td>
            <td>
                <a class="action-btn" href="${u.photo3x4}" download>
                    Tải
                </a>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function downloadAllPhotos() {
    window.open("/api/admin/photos/download", "_blank");
}

function openPhotoModal(photoUrl) {
    document.getElementById("photoModalImg").src = photoUrl;
    document.getElementById("photoModal").style.display = "flex";
}

function closePhotoModal() {
    document.getElementById("photoModal").style.display = "none";
    document.getElementById("photoModalImg").src = "";
}

/* =====================================================
   INIT
===================================================== */
async function initAdmin() {
    const ok = await checkAdmin();
    if (!ok) return;

    loadUsers();
}

initAdmin();

/* =====================================================
   LOGOUT
===================================================== */
function logoutAdmin() {
    fetch(API + "/auth/logout", {
        method: "POST",
        credentials: "include"
    });

    showToast("Đã đăng xuất!", "success");

    setTimeout(() => {
        window.location.href = "/";
    }, 900);
}
