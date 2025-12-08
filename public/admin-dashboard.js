const API = "https://xuan-tinh-nguyen-2026-production.up.railway.app/api";

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
    document.getElementById("pageTitle").textContent = "Danh sách đăng ký";
    document.getElementById("userTable").style.display = "table";
    document.getElementById("mediaTable").style.display = "none";

    try {
        const res = await fetch(API + "/admin/list", { credentials: "include" });

        if (!res.ok) {
            showToast("Không thể tải danh sách!", "error");
            return;
        }

        allUsers = await res.json();
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

    if (statusFilter) {
        if (statusFilter === "Chưa phỏng vấn") {
            filtered = filtered.filter(u => !u.reg.interviewResult);
        } else {
            filtered = filtered.filter(u => u.reg.interviewResult === statusFilter);
        }
    }

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
        loadUsers();

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
        loadUsers();

    } catch {
        showToast("Lỗi kết nối server!", "error");
    }
}

/* =====================================================
   MEDIA TEAM
===================================================== */
let allMedia = [];

async function loadMediaList() {
    document.getElementById("pageTitle").textContent = "Danh sách đội hình Truyền thông";

    document.getElementById("userTable").style.display = "none";
    document.getElementById("mediaTable").style.display = "table";

    try {
        const res = await fetch(API + "/admin/media/list", { credentials: "include" });
        if (!res.ok) return showToast("Không thể tải danh sách đội hình!", "error");

        allMedia = await res.json();
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

            <td><a href="${r.facebook}" target="_blank">FB</a></td>

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
