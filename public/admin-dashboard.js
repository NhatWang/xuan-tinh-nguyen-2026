const API = "https://xuan-tinh-nguyen-2026-production.up.railway.app/api";

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

/* ===== TOAST UI ===== */
function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toast");
    const toast = document.createElement("div");

    toast.classList.add("toast", type);
    toast.innerHTML = `<i>${type === "success" ? "✔" : "✖"}</i> ${message}`;

    toastContainer.appendChild(toast);

    setTimeout(() => toast.remove(), 3200);
}

/* =============================
   CHECK ADMIN
============================= */
async function checkAdmin() {
    try {
        const res = await fetch(API + "/auth/me", { credentials: "include" });

        if (!res.ok) {
            showToast("Bạn chưa đăng nhập!", "warning");
            window.location.href = "../frontend-dang-ky/login.html";
            return false;
        }

        const user = await res.json();

        if (user.role !== "admin") {
            showToast("Bạn không có quyền truy cập trang admin!", "error");
            window.location.href = "../dashboard/dashboard.html";
            return false;
        }

        return true;

    } catch (err) {
        showToast("Không thể kết nối server!", "error");
        return false;
    }
}

/* =============================
   LOAD DANH SÁCH ĐĂNG KÝ
============================= */
let allUsers = [];

async function loadUsers() {
    try {
        const res = await fetch(API + "/admin/list", { credentials: "include" });

        if (!res.ok) return alert("Không thể tải danh sách!");

        allUsers = await res.json();
        renderTable(allUsers);

    } catch {
        alert("Không thể kết nối server!");
    }
}

function safe(text) {
    return text?.replace(/[&<>"]/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    })[c]) || "";
}

/* Render bảng */
function renderTable(list) {
    const table = document.getElementById("tableBody");
    table.innerHTML = "";

    list.forEach(item => {
        const u = item.user;
        const r = item.reg;

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

            <td><a href="${r.facebook || "#"}" target="_blank">FB</a></td>
            <td>${safe(r.interviewResult || "Chưa phỏng vấn")}</td>

            <td>
                <button class="action-btn" onclick="previewPDF('${r._id}', '${safe(u.fullName)}')">
                    Xem trước
                </button>

                <button class="action-btn" onclick="downloadPDF('${r._id}', '${safe(u.fullName)}')">
                    Tải xuống
                </button>
            </td>

            <td>
                <button class="action-btn" onclick="openInterviewModal('${r._id}', '${safe(r.interviewNote || "")}', '${safe(r.interviewResult || "")}', '${safe(r.interviewer || "")}')">
                    Phỏng vấn
                </button>
            </td>

            <td>${safe(r.interviewer || "—")}</td>
        `;

        table.appendChild(tr);
    });
}

/* =============================
    LỌC DANH SÁCH
============================= */
function filterUsers() {
    const text = document.getElementById("searchText").value.trim().toLowerCase();
    const nvFilter = document.getElementById("filterNV").value;
    const statusFilter = document.getElementById("filterStatus").value;

    let filtered = [...allUsers];

    // Lọc theo Tên hoặc MSSV
    if (text) {
        filtered = filtered.filter(u =>
            u.user.fullName.toLowerCase().includes(text) ||
            u.user.studentId.toLowerCase().includes(text)
        );
    }

    // Lọc theo nguyện vọng 1 (rút gọn)
    if (nvFilter) {
        filtered = filtered.filter(u =>
            shortName(u.reg.nv1) === shortName(nvFilter)
        );
    }

    // Lọc theo trạng thái
    if (statusFilter) {
        if (statusFilter === "Chưa phỏng vấn") {
            filtered = filtered.filter(u => !u.reg.interviewResult);
        } else {
            filtered = filtered.filter(u => u.reg.interviewResult === statusFilter);
        }
    }

    renderTable(filtered);
}


/* =============================
   DOWNLOAD PDF
============================= */
async function downloadPDF(regId, fullName) {
    try {
        const res = await fetch(API + `/admin/export/${regId}`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            return showToast("Không thể tải PDF!", "error");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${fullName}.pdf`;
        a.click();

        window.URL.revokeObjectURL(url);
    } catch (err) {
        showToast("Lỗi khi tải PDF!", "error");
    }
}


/* =============================
   PHỎNG VẤN
============================= */
let currentRegId = null;

function openInterviewModal(id, note, result, interviewer) {
    currentRegId = id;

    document.getElementById("interviewNote").value = note || "";
    document.getElementById("interviewResult").value = result || "Chờ duyệt";
    document.getElementById("interviewer").value = interviewer || "";

    document.getElementById("interviewModal").style.display = "flex";
}

function closeInterviewModal() {
    document.getElementById("interviewModal").style.display = "none";
}

/* =============================
   INIT
============================= */
async function initAdmin() {
    const ok = await checkAdmin();
    if (!ok) return;

    await loadUsers();
}

initAdmin();

/* =============================
    LƯU NGƯỜI PHỎNG VẤN
============================= */
async function saveInterview() {
    const note = document.getElementById("interviewNote").value;
    const result = document.getElementById("interviewResult").value;
    const interviewer = document.getElementById("interviewer").value.trim();

    if (!interviewer) {
        showToast("Vui lòng nhập tên người phỏng vấn!", "warning");
        return;
    }

    const res = await fetch(API + `/admin/interview/${currentRegId}`, {
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

    showToast("Đã lưu!", "success");
    closeInterviewModal();
    loadUsers();
}

/* =============================
   XEM TRƯỚC PDF
============================= */
async function previewPDF(regId) {
    try {
        const res = await fetch(API + `/admin/export/${regId}`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            return showToast("Không thể tạo PDF!", "error");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        document.getElementById("pdfFrame").src = url;
        document.getElementById("pdfModal").style.display = "flex";

    } catch (err) {
        showToast("Lỗi khi xem PDF!", "error");
    }
}

function closePDFModal() {
    document.getElementById("pdfModal").style.display = "none";
    document.getElementById("pdfFrame").src = ""; // Reset PDF để giải phóng bộ nhớ
}

// ======================
// THEME SWITCH
// ======================
const root = document.documentElement;
const themeBtn = document.createElement("button");

themeBtn.className = "theme-switch";
themeBtn.innerText = "Đổi giao diện 🌗";

document.querySelector(".sidebar").appendChild(themeBtn);

// Load theme saved
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

themeBtn.onclick = () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark"))
        localStorage.setItem("theme", "dark");
    else
        localStorage.setItem("theme", "light");
};


