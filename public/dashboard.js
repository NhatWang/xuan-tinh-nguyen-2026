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

/* ============ TABS ============ */
function showTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(tab).classList.add("active");

    document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.menu-btn[onclick="showTab('${tab}')"]`).classList.add("active");
}

/* ============ DISABLE FORM ============ */
function disableRegistrationForm() {
    document.querySelectorAll('#registration input, #registration select, #registration textarea')
        .forEach(el => el.disabled = true);

    const btn = document.querySelector('#registration button');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Bạn đã gửi đăng ký";
        btn.style.opacity = "0.6";
    }
}

/* ============ LOAD PROFILE ============ */
async function loadProfile() {
    const userRes = await fetch(API + "/auth/me", { credentials: "include" });

    if (userRes.status === 401) {
        return window.location.href = "login.html";
    }

    const user = await userRes.json();

    document.getElementById("pf_name").innerText = user.fullName;
    document.getElementById("pf_studentId").innerText = user.studentId;
    document.getElementById("pf_class").innerText = user.className;
    document.getElementById("pf_faculty").innerText = user.faculty;
    document.getElementById("pf_university").innerText = user.university;
    document.getElementById("pf_email").innerText = user.email;
    document.getElementById("pf_phone").innerText = user.phone;

    const regRes = await fetch(API + "/registration/me", { credentials: "include" });

    if (regRes.status === 200) {
        const reg = await regRes.json();

        document.getElementById("pf_interviewResult").innerText = reg.interviewResult || "Chưa phỏng vấn";
        document.getElementById("pf_interviewNote").innerText = reg.interviewNote || "—";
        document.getElementById("pf_interviewer").innerText = reg.interviewer || "—";

        disableRegistrationForm();
    }
}

/* ============ LOAD REGISTRATION FORM ============ */
async function loadRegistrationForm() {
    const res = await fetch(API + "/registration/me", { credentials: "include" });

    if (res.status !== 200) return;

    const r = await res.json();

    const safe = (v) => (v ? v : "");

    document.getElementById("dob").value = safe(r.dob?.substring?.(0, 10));
    document.getElementById("gender").value = safe(r.gender);
    document.getElementById("facebook").value = safe(r.facebook);
    document.getElementById("address").value = safe(r.address);

    document.getElementById("nv1").value = safe(r.nv1);
    document.getElementById("nv2").value = safe(r.nv2);
    document.getElementById("nv3").value = safe(r.nv3);
    document.getElementById("nv4").value = safe(r.nv4);
    document.getElementById("nv5").value = safe(r.nv5);
    document.getElementById("nv6").value = safe(r.nv6);
    document.getElementById("major").value = safe(r.major);

    if (Array.isArray(r.skills)) {
        r.skills.forEach(skill => {
            const cb = document.querySelector(`input[type="checkbox"][value="${skill}"]`);
            if (cb) cb.checked = true;
        });
    }

    document.getElementById("size").value = safe(r.size);
    document.getElementById("bio").value = safe(r.bio);
    document.getElementById("health").value = safe(r.health);

    if (r.cdtn) {
        const cdt = document.querySelector(`input[name="cdtn"][value="${r.cdtn}"]`);
        if (cdt) cdt.checked = true;
    }
    if (r.vehicle) {
        const v = document.querySelector(`input[name="vehicle"][value="${r.vehicle}"]`);
        if (v) v.checked = true;
    }
    if (r.license) {
        const l = document.querySelector(`input[name="license"][value="${r.license}"]`);
        if (l) l.checked = true;
    }
    if (r.lab) {
        const lab = document.querySelector(`input[name="lab"][value="${r.lab}"]`);
        if (lab) lab.checked = true;
    }

    disableRegistrationForm();
}

/* ============ INIT ============ */
async function initDashboard() {
    await loadProfile();
    await loadRegistrationForm();
}
initDashboard();

/* ============ SUBMIT REGISTRATION ============ */
async function submitRegistration() {
    const btn = document.querySelector('#registration button');

    btn.disabled = true;
    btn.innerText = "Đang gửi...";

    const dob = document.getElementById("dob").value;
    const gender = document.getElementById("gender").value;
    const facebook = document.getElementById("facebook").value;
    const address = document.getElementById("address").value;

    const nv1 = document.getElementById("nv1").value;
    const nv2 = document.getElementById("nv2").value;
    const nv3 = document.getElementById("nv3").value;
    const nv4 = document.getElementById("nv4").value;
    const nv5 = document.getElementById("nv5").value;
    const nv6 = document.getElementById("nv6").value;
    const major = document.getElementById("major").value;

    const skills = Array.from(document.querySelectorAll('.checkboxes input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    const size = document.getElementById("size").value;
    const bio = document.getElementById("bio").value;
    const health = document.getElementById("health").value;

    const cdtn = document.querySelector('input[name="cdtn"]:checked')?.value;
    const vehicle = document.querySelector('input[name="vehicle"]:checked')?.value;
    const license = document.querySelector('input[name="license"]:checked')?.value;
    const lab = document.querySelector('input[name="lab"]:checked')?.value;

    // ========== VALIDATION ==========
    if (!dob || !gender || !facebook || !address || !nv1 || !major) {
    showToast("Vui lòng nhập đầy đủ thông tin bắt buộc!", "error");
    btn.disabled = false;
    btn.innerText = "Gửi đăng ký";
    return;
}

    // FACEBOOK LINK CHECK (bản fix mạnh nhất)
    const fbRegex = /^https?:\/\/(www\.)?(facebook|fb)\.com\/[A-Za-z0-9\.\/_\-]+$/;
    if (!fbRegex.test(facebook)) {
        btn.disabled = false;
        btn.innerText = "Gửi đăng ký";
        return showToast("Vui lòng nhập link Facebook hợp lệ!", "error");
    }

    // Check NV trùng nhau
    const nvList = [nv1, nv2, nv3, nv4, nv5, nv6].filter(v => v && v !== "Không");
    if (new Set(nvList).size !== nvList.length) {
        btn.disabled = false;
        btn.innerText = "Gửi đăng ký";
        return showToast("Các nguyện vọng không được trùng nhau!", "error");
    }

    const body = {
        dob, gender, facebook, address,
        nv1, nv2, nv3, nv4, nv5, nv6,
        major,
        skills, size, bio, health,
        cdtn, vehicle, license, lab
    };

    try {
        const res = await fetch(API + "/registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok) {
            showToast("Gửi đăng ký thành công!", "success");
            disableRegistrationForm();
        } else {
            showToast(data.msg || "Gửi đăng ký thất bại!", "error");
        }

    } catch {
        showToast("Lỗi kết nối server!", "error");
    }

    btn.disabled = false;
    btn.innerText = "Gửi đăng ký";
}

/* ============ LOGOUT ============ */
async function logout() {
    await fetch(API + "/auth/logout", {
        method: "POST",
        credentials: "include"
    });

    window.location.href = "login.html";
}

/* ============ TOAST FALLBACK ============ */
if (typeof showToast !== "function") {
    window.showToast = function (msg, type = "error") {
        alert(msg);
    };
}
