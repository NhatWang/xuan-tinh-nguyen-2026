const API = "https://xuan-tinh-nguyen-2026-production.up.railway.app/api/auth";

/* =====================================================
   LOGIN
===================================================== */
async function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!email || !password) {
    showToast("Vui lòng nhập email và mật khẩu!", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Sai email hoặc mật khẩu!", "error");
      return;
    }

    showToast("Đăng nhập thành công!", "success");

    setTimeout(() => {
      // ⭐ Điều hướng theo ROLE
      if (data.role === "admin") {
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
   REGISTER
===================================================== */
async function register() {
  const body = {
    fullName: fullName?.value.trim(),
    className: className?.value.trim(),
    faculty: faculty?.value.trim(),
    university: university?.value.trim(),
    studentId: studentId?.value.trim(),
    email: email?.value.trim(),
    phone: phone?.value.trim(),
    password: password?.value.trim()
  };

  for (let key in body) {
    if (!body[key]) {
      showToast("Vui lòng nhập đầy đủ thông tin!", "warning");
      return;
    }
  }

  // Email format check
  if (!/^\S+@\S+\.\S+$/.test(body.email)) {
    showToast("Email không hợp lệ!", "error");
    return;
  }

  // Phone check
  if (!/^\d{9,11}$/.test(body.phone)) {
    showToast("Số điện thoại không hợp lệ!", "error");
    return;
  }

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Đăng ký thất bại!", "error");
      return;
    }

    showToast("Đăng ký thành công! Hãy kiểm tra email để xác minh.", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);

  } catch {
    showToast("Không thể kết nối server!", "warning");
  }
}


/* =====================================================
   FORGOT PASSWORD
===================================================== */
async function forgotPassword() {
  const email = document.getElementById("forgotEmail")?.value.trim();

  if (!email) return showToast("Vui lòng nhập email!", "warning");

  try {
    const res = await fetch(`${API}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Không gửi được email reset!", "error");
      return;
    }

    showToast("Đã gửi email đặt lại mật khẩu!", "success");

  } catch {
    showToast("Không thể kết nối server!", "warning");
  }
}


/* =====================================================
   RESET PASSWORD
===================================================== */
async function resetPassword() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (!token) {
    showToast("Link reset mật khẩu không hợp lệ!", "error");
    return;
  }

  const password = document.getElementById("newPassword")?.value.trim();

  if (!password) {
    showToast("Mật khẩu mới không được để trống!", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/reset-password/${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Không thể đặt lại mật khẩu!", "error");
      return;
    }

    showToast("Đặt mật khẩu mới thành công!", "success");

    setTimeout(() => window.location.href = "login.html", 1200);

  } catch {
    showToast("Lỗi kết nối server!", "warning");
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
