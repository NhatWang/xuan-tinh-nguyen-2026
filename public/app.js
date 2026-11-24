const API = "/api/auth";
const SV5T_BASE_URL = "https://cungnhau5tot.id.vn";

/* =====================================================
   LOGIN (email + password — tài khoản đăng ký thủ công)
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

  if (!/^\S+@\S+\.\S+$/.test(body.email)) {
    showToast("Email không hợp lệ!", "error");
    return;
  }

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

    showToast("Đăng ký thành công! Bạn có thể đăng nhập ngay.", "success");

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
   ĐĂNG NHẬP QUA SV5T (kiểu "Đăng nhập bằng Google/Zalo")
   Redirect sang trang đăng nhập thật của SV5T, SV5T redirect
   ngược về oauth-callback.html kèm 1 authorization code.
===================================================== */
function buildOAuthRedirectUrl(sv5tLoginPath) {
  const state = crypto.randomUUID();
  sessionStorage.setItem("sv5t_oauth_state", state);

  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const url = new URL(sv5tLoginPath, SV5T_BASE_URL);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

function startSV5TLogin() {
  window.location.href = buildOAuthRedirectUrl("/student.html");
}

function startSV5TAdminLogin() {
  window.location.href = buildOAuthRedirectUrl("/admin.html");
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = sessionStorage.getItem("sv5t_oauth_state");
  sessionStorage.removeItem("sv5t_oauth_state");

  if (!code || !state || state !== expectedState) {
    showToast("Phiên đăng nhập không hợp lệ, vui lòng thử lại!", "error");
    setTimeout(() => (window.location.href = "login.html"), 1500);
    return;
  }

  try {
    const res = await fetch(`${API}/oauth-callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.msg || "Đăng nhập thất bại!", "error");
      setTimeout(() => (window.location.href = "login.html"), 1500);
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
    }, 600);

  } catch {
    showToast("Không thể kết nối đến server!", "warning");
    setTimeout(() => (window.location.href = "login.html"), 1500);
  }
}

/* =====================================================
   HOÀN TẤT HỒ SƠ (lần đầu đăng nhập)
===================================================== */
async function completeProfile() {
  const body = {
    email: document.getElementById("email")?.value.trim(),
    phone: document.getElementById("phone")?.value.trim()
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
