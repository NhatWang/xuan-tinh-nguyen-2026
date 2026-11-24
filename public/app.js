const API = "/api/auth";

/* =====================================================
   LOGIN (qua tài khoản SV5T - Hành trình cùng nhau 5 Tốt)
===================================================== */
async function login() {
  const studentId = document.getElementById("studentId")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!studentId || !password) {
    showToast("Vui lòng nhập MSSV và mật khẩu!", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ studentId, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Sai MSSV hoặc mật khẩu!", "error");
      return;
    }

    showToast("Đăng nhập thành công!", "success");

    setTimeout(() => {
      if (!data.profileCompleted) {
        window.location.href = "complete-profile.html";
      } else if (data.role === "admin") {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "dashboard.html";
      }
    }, 800);

  } catch {
    showToast("Không thể kết nối đến server!", "warning");
  }
}

/* =====================================================
   ADMIN LOGIN (qua tài khoản Admin của SV5T)
===================================================== */
async function adminLogin() {
  const username = document.getElementById("adminUsername")?.value.trim();
  const password = document.getElementById("adminPassword")?.value.trim();

  if (!username || !password) {
    showToast("Vui lòng nhập username và mật khẩu!", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Sai username hoặc mật khẩu!", "error");
      return;
    }

    showToast("Đăng nhập thành công!", "success");

    setTimeout(() => {
      window.location.href = "admin-dashboard.html";
    }, 800);

  } catch {
    showToast("Không thể kết nối đến server!", "warning");
  }
}

/* =====================================================
   HOÀN TẤT HỒ SƠ (lần đầu đăng nhập)
===================================================== */
async function completeProfile() {
  const body = {
    email: document.getElementById("email")?.value.trim(),
    phone: document.getElementById("phone")?.value.trim(),
    faculty: document.getElementById("faculty")?.value.trim(),
    university: document.getElementById("university")?.value.trim()
  };

  if (!body.email || !body.phone) {
    showToast("Vui lòng nhập đầy đủ email và số điện thoại!", "warning");
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(body.email)) {
    showToast("Email không hợp lệ!", "error");
    return;
  }

  if (!/^\d{9,11}$/.test(body.phone)) {
    showToast("Số điện thoại không hợp lệ!", "error");
    return;
  }

  try {
    const res = await fetch(`${API}/complete-profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Cập nhật hồ sơ thất bại!", "error");
      return;
    }

    showToast("Cập nhật hồ sơ thành công!", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);

  } catch {
    showToast("Không thể kết nối server!", "warning");
  }
}


/* =====================================================
   UNIVERSAL PASSWORD TOGGLE (Fix lỗi all pages)
===================================================== */
function togglePassword(btn) {
  const targetId = btn.dataset.target;
  const input = document.getElementById(targetId);
  const icon = btn.querySelector("img");

  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    icon.src = "icons/eye.svg";
  } else {
    input.type = "password";
    icon.src = "icons/eye-slash.svg";
  }
}


/* =====================================================
   TOAST
===================================================== */
function showToast(message, type = "error") {
  const toastContainer = document.getElementById("toast");
  const toast = document.createElement("div");
  toast.classList.add("toast", type);

  const icon = type === "success" ? "✔" : type === "warning" ? "⚠" : "✖";

  toast.innerHTML = `<i>${icon}</i><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}
