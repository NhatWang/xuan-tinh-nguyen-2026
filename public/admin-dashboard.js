const API = "/api";

let currentResultId = null;
let currentResultNote = "";
let currentResultInterviewer = "";

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

const BASE = "https://xuan-tinh-nguyen-2026-production.up.railway.app";
const ADMIN_AVATARS = {
    "lchhh.hcmus@gmail.com": BASE + "/avatars/lch.png",
    "hoahoc.kttt@gmail.com": BASE + "/avatars/chemme.jpg",
    "dsvtn.hh.khtn@gmail.com": BASE + "/avatars/svtn.jpg"
};

function loadAdminAvatar(email) {
    const img = document.getElementById("adminAvatar");
    if (!img) return;
    img.src = ADMIN_AVATARS[email] || (BASE + "/avatars/default.jpg");
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
        document.getElementById("adminEmail").textContent = user.email;
        loadAdminAvatar(user.email);
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
        const u = item.user;
        const r = item.reg;

        const isNotInterviewed = !r.interviewResult || r.interviewResult === "Chưa phỏng vấn";
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", r._id);

        tr.innerHTML = `
            <td>${safe(u.fullName)}</td>
            <td>${safe(u.studentId)}</td>
            <td>${safe(u.email)}</td>

            <td>${shortName(r.nv1)}</td>
            <td>${shortName(r.nv2)}</td>
            <td>${shortName(r.nv3)}</td>
            <td>${shortName(r.nv4)}</td>
            <td>${shortName(r.nv5)}</td>
            <td>${shortName(r.nv6)}</td>

            <td><a href="${r.facebook}" target="_blank">${safe(u.fullName)}</a></td>
            <td>${safe(r.interviewLocation || "—")}</td>
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
            u.user.fullName.toLowerCase().includes(text) ||
            u.user.studentId.toLowerCase().includes(text)
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

        updateInterviewRow(currentResultId);

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
        updateInterviewRow(currentRegId);

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
