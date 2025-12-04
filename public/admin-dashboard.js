const API = "https://xuan-tinh-nguyen-2026-production.up.railway.app/api";

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
            alert("Bạn chưa đăng nhập!");
            window.location.href = "../frontend-dang-ky/login.html";
            return false;
        }

        const user = await res.json();

        if (user.role !== "admin") {
            alert("Bạn không có quyền truy cập trang admin!");
            window.location.href = "../dashboard/dashboard.html";
            return false;
        }

        return true;

    } catch (err) {
        alert("Không thể kết nối server!");
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

        const nvList = [r.nv1, r.nv2, r.nv3, r.nv4, r.nv5, r.nv6]
            .filter(v => v && v !== "Không")
            .join(", ");

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${safe(u.fullName)}</td>
            <td>${safe(u.studentId)}</td>
            <td>${safe(u.email)}</td>
            <td>${safe(nvList)}</td>
            <td><a href="${r.facebook || "#"}" target="_blank">Facebook</a></td>
            <td>${safe(r.interviewResult || "Chưa phỏng vấn")}</td>

            <td>
                <button class="action-btn" onclick="downloadPDF('${r._id}', '${safe(u.fullName)}')">
                    Xem hồ sơ
                </button>
            </td>

            <td>
                <button class="action-btn" onclick="openInterviewModal('${r._id}', '${safe(r.interviewNote || "")}', '${safe(r.interviewResult || "")}')">
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
    const nvFilter = document.getElementById("filterNV").value;
    const statusFilter = document.getElementById("filterStatus").value;

    let filtered = [...allUsers];

    if (nvFilter) {
        filtered = filtered.filter(u => {
            const r = u.reg;
            return [r.nv1, r.nv2, r.nv3, r.nv4, r.nv5, r.nv6].includes(nvFilter);
        });
    }

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
        const res = await fetch(API + `/export/${regId}`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            return alert("Không thể tải PDF!");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${fullName}.pdf`;
        a.click();

        window.URL.revokeObjectURL(url);

    } catch (err) {
        alert("Lỗi khi tải PDF!");
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

/* SAVE INTERVIEW */
async function saveInterview() {
    const note = document.getElementById("interviewNote").value;
    const result = document.getElementById("interviewResult").value;

    try {
        const res = await fetch(API + `/admin/interview/${currentRegId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ interviewNote: note, interviewResult: result })
        });

        if (!res.ok) return alert("Lưu thất bại!");

        alert("Đã lưu!");
        closeInterviewModal();
        loadUsers();

    } catch {
        alert("Không thể kết nối server!");
    }
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
        alert("Vui lòng nhập tên người phỏng vấn!");
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

    if (!res.ok) return alert("Lưu thất bại!");

    alert("Đã lưu!");
    closeInterviewModal();
    loadUsers();
}
