const API = "/api";
let currentReg = null;
let currentUserId = null;   // ⭐ THÊM
let socket = null;

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
window.showTab = function (tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(tab).classList.add("active");

    document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
    document
        .querySelector(`.menu-btn[onclick="showTab('${tab}')"]`)
        ?.classList.add("active");
};

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
    /* =========================
       1️⃣ LẤY USER
    ========================= */
    const userRes = await fetch(API + "/auth/me", { credentials: "include" });

    if (userRes.status === 401) {
        window.location.href = "login.html";
        return;
    }

    const user = await userRes.json();
    currentUserId = user._id;

    // Hiển thị thông tin tài khoản
    document.getElementById("pf_name").innerText = user.fullName;
    document.getElementById("pf_studentId").innerText = user.studentId;
    document.getElementById("pf_class").innerText = user.className;
    document.getElementById("pf_faculty").innerText = user.faculty;
    document.getElementById("pf_university").innerText = user.university;
    document.getElementById("pf_email").innerText = user.email;
    document.getElementById("pf_phone").innerText = user.phone;

    /* =========================
       2️⃣ LẤY REGISTRATION
    ========================= */
    const regRes = await fetch(API + "/registration/me", {
        credentials: "include"
    });

    if (regRes.status === 200) {
        const reg = await regRes.json();
        currentReg = reg;

        document.getElementById("pf_interviewCa").innerText =
            reg.interviewLocation || "Chưa có";

        document.getElementById("pf_interviewTime").innerText =
            getInterviewTime(reg.interviewLocation);

        document.getElementById("pf_interviewResult").innerText =
            reg.interviewResult || "Chưa phỏng vấn";

        document.getElementById("pf_interviewStatus").innerText =
            renderInterviewStatus(reg.interviewStatus);

        const roomRow = document.getElementById("interviewRoomRow");
        const joinRow = document.getElementById("joinOnlineRow");
        const statusRow = document.getElementById("statusRow");

        // ===== OFFLINE =====
        if (reg.interviewLocation !== "Khác") {
            roomRow.style.display = "flex";
            joinRow.style.display = "none";

            document.getElementById("pf_interviewRoom").innerText =
                reg.interviewRoom || "Thông báo sau";

            statusRow.style.display = "none";
        // ===== ONLINE =====
        } else {
            roomRow.style.display = "none";
            statusRow.style.display = "flex";
            joinRow.style.display =
                reg.interviewStatus === "calling" && reg.interviewRoomId
                    ? "flex"
                    : "none";
        }
    } else {
        document.getElementById("pf_interviewResult").innerText = "Chưa đăng ký";
        document.getElementById("pf_interviewRoom").innerText = "Chưa có";
        document.getElementById("pf_interviewCa").innerText = "Chưa có";
        document.getElementById("pf_interviewTime").innerText = "Chưa có";
        document.getElementById("pf_interviewStatus").innerText =
            renderInterviewStatus("idle");
    }

    /* =========================
       3️⃣ LOAD MEDIA TEAM RESULT
    ========================= */
    const mediaRes = await fetch(API + "/media/me", { credentials: "include" });

    if (mediaRes.status === 200) {
        const media = await mediaRes.json();
        document.getElementById("pf_media_interviewResult").innerText =
            media.interviewResult || "Chưa phỏng vấn";
    } else {
        document.getElementById("pf_media_interviewResult").innerText =
            "Chưa đăng ký";
    }

    /* =========================
       4️⃣ SYNC ONLINE STATUS (RELOAD PAGE)
    ========================= */
    if (currentReg) {
        const statusRes = await fetch("/api/user/interview/status", {
            credentials: "include"
        });

        if (statusRes.ok) {
            const data = await statusRes.json();

            if (data.online) {
                currentReg.interviewStatus = data.status;
                currentReg.interviewRoomId = data.roomId;

                document.getElementById("pf_interviewStatus").innerText =
                    renderInterviewStatus(data.status);

                const joinRow = document.getElementById("joinOnlineRow");
                if (joinRow) {
                    joinRow.style.display =
                data.status === "calling" && data.roomId
                    ? "flex"
                    : "none";
                }
            }
        }
    }

    /* =========================
       5️⃣ SOCKET INIT
    ========================= */
    if (!socket) {
    socket = io({ withCredentials: true });

    socket.emit("join:user", currentUserId);

    socket.on("interview:roomAssigned", data => {
    if (!currentReg) return;
    if (currentReg.interviewLocation !== "Khác") return;

    currentReg.interviewStatus = "waiting";
    currentReg.interviewRoomId = data.roomId;

    document.getElementById("pf_interviewStatus").innerText =
        renderInterviewStatus("waiting");

    const joinRow = document.getElementById("joinOnlineRow");
    if (joinRow) joinRow.style.display = "none";
});


    // Admin gọi phỏng vấn
    socket.on("interview:calling", data => {
    showToast("Đến lượt phỏng vấn online!", "success");

    if (!currentReg) return;

    currentReg.interviewStatus = "calling";
    currentReg.interviewRoomId = data.roomUrl; // ✅ FIX

    document.getElementById("pf_interviewStatus").innerText =
        renderInterviewStatus("calling");

    const joinRow = document.getElementById("joinOnlineRow");
    if (joinRow) joinRow.style.display = "flex";
});

    // Admin kết thúc phỏng vấn
    socket.on("interview:ended", () => {
        showToast("Buổi phỏng vấn đã kết thúc", "warning");

        if (currentReg) {
            currentReg.interviewStatus = "ended";
            currentReg.interviewRoomId = null;
        }

        document.getElementById("pf_interviewStatus").innerText =
            renderInterviewStatus("ended");

        const joinRow = document.getElementById("joinOnlineRow");
        if (joinRow) joinRow.style.display = "none";
    });
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
    if (r.interviewLocation) {
        const selectedRadio = document.querySelector(
            `input[name="interviewLocation"][value="${r.interviewLocation}"]`
        );
        if (selectedRadio) selectedRadio.checked = true;
    }

    disableRegistrationForm();
}

/* ============ INIT ============ */
async function initDashboard() {
    await loadProfile();
    await loadRegistrationForm();
    await loadMediaForm();
    await checkRegistrationClosed();
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

    const interviewLocation = document.querySelector('input[name="interviewLocation"]:checked')?.value;

    const skills = Array.from(document.querySelectorAll('#registration .checkboxes input[type="checkbox"]:checked'))
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

    if (!interviewLocation) {
        showToast("Vui lòng chọn địa điểm phỏng vấn!", "error");
        return;
    }

    const body = {
        dob, gender, facebook, address,
        nv1, nv2, nv3, nv4, nv5, nv6,
        major,
        skills, size, bio, health,
        cdtn, vehicle, license, lab,
        interviewLocation
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

/* =============================
    TỰ ĐỘNG RESIZE + ĐẾM CHỮ 
============================= */
function autoResize(textarea) {
    textarea.style.height = "auto"; 
    textarea.style.height = textarea.scrollHeight + "px";
}

function setupTextarea(textarea, counterId, limit) {
    const counter = document.getElementById(counterId);

    textarea.addEventListener("input", () => {
        // TỰ ĐỘNG RESIZE
        autoResize(textarea);

        // ĐẾM CHỮ
        let words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0);

        // GIỚI HẠN 60 CHỮ
        if (words.length > limit) {
            textarea.value = words.slice(0, limit).join(" ");
            words = words.slice(0, limit);
            showToast(`Chỉ được nhập tối đa ${limit} chữ!`, "warning");
            autoResize(textarea); // resize lại sau khi cắt chữ
        }

        // CẬP NHẬT BỘ ĐẾM
        counter.textContent = `${words.length} / ${limit} chữ`;
    });

    // Resize lần đầu khi load
    autoResize(textarea);
}

document.addEventListener("DOMContentLoaded", () => {
    setupTextarea(document.getElementById("bio"), "bio_count", 60);
    setupTextarea(document.getElementById("health"), "health_count", 60);
});

async function submitMediaTeam() {

    const btn = document.querySelector('#mediaTeam button');
    btn.disabled = true;
    btn.innerText = "Đang gửi...";

    const gender = document.getElementById("media_gender").value;
    const dob = document.getElementById("media_dob").value;
    const facebook = document.getElementById("media_facebook").value.trim();
    const address = document.getElementById("media_address").value.trim();
    const major = document.getElementById("media_major").value.trim();
    const bio = document.getElementById("media_bio").value.trim();
    const health = document.getElementById("media_health").value.trim();

    const cdtn = document.querySelector("input[name='media_cdtn']:checked")?.value;
    const vehicle = document.querySelector("input[name='media_vehicle']:checked")?.value;
    const license = document.querySelector("input[name='media_license']:checked")?.value;

    const mediaRoles = [...document.querySelectorAll("#mediaTeam input[name='media_role']:checked")]
        .map(i => i.value);

    const mediaLocations = [...document.querySelectorAll("#mediaTeam input[name='media_locations']:checked")]
        .map(i => i.value);

    const size = document.getElementById("media_size").value;

    if (!gender || !dob || !facebook || !address || !major || !bio || !health ||
        !cdtn || !vehicle || !license || mediaRoles.length === 0 || mediaLocations.length === 0 || !size) {

        showToast("Vui lòng điền đầy đủ thông tin!", "warning");
        btn.disabled = false;
        btn.innerText = "GỬI ĐĂNG KÝ ĐỘI HÌNH TRUYỀN THÔNG";
        return;
    }

    // CHECK FACEBOOK
    const fbRegex = /^https?:\/\/(www\.)?(facebook|fb)\.com\/[A-Za-z0-9\.\/_\-]+$/;
    if (!fbRegex.test(facebook)) {
        showToast("Link Facebook không hợp lệ!", "error");
        btn.disabled = false;
        btn.innerText = "GỬI ĐĂNG KÝ ĐỘI HÌNH TRUYỀN THÔNG";
        return;
    }

    try {
        const res = await fetch(API + "/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                gender, dob, facebook, address, major,
                bio, health, cdtn, vehicle, license,
                mediaRoles, mediaLocations, size
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.msg || "Lỗi đăng ký!", "error");
        } else {
            showToast("Đăng ký đội hình truyền thông thành công!", "success");
            disableMediaForm();
        }

    } catch (err) {
    showToast("Không thể kết nối server!", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "GỬI ĐĂNG KÝ ĐỘI HÌNH TRUYỀN THÔNG";
    }
    }


function disableMediaForm() {
    document.querySelectorAll('#mediaTeam input, #mediaTeam select, #mediaTeam textarea')
        .forEach(el => el.disabled = true);

    const btn = document.querySelector('#mediaTeam button');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Bạn đã gửi đăng ký";
        btn.style.opacity = "0.6";
    }
}

async function loadMediaForm() {
    const res = await fetch(API + "/media/me", { credentials: "include" });

    if (res.status !== 200) return;

    const r = await res.json();

    const safe = (v) => v || "";

    document.getElementById("media_dob").value = safe(r.dob?.substring?.(0, 10));
    document.getElementById("media_gender").value = safe(r.gender);
    document.getElementById("media_facebook").value = safe(r.facebook);
    document.getElementById("media_address").value = safe(r.address);
    document.getElementById("media_major").value = safe(r.major);
    document.getElementById("media_bio").value = safe(r.bio);
    document.getElementById("media_health").value = safe(r.health);

    if (r.cdtn) document.querySelector(`input[name='media_cdtn'][value="${r.cdtn}"]`).checked = true;
    if (r.vehicle) document.querySelector(`input[name='media_vehicle'][value="${r.vehicle}"]`).checked = true;
    if (r.license) document.querySelector(`input[name='media_license'][value="${r.license}"]`).checked = true;

    if (Array.isArray(r.mediaRoles)) {
        r.mediaRoles.forEach(role => {
            const cb = document.querySelector(`input[name='media_role'][value="${role}"]`);
            if (cb) cb.checked = true;
        });
    }

    if (Array.isArray(r.mediaLocations)) {
        r.mediaLocations.forEach(loc => {
            const cb = document.querySelector(`input[name='media_locations'][value="${loc}"]`);
            if (cb) cb.checked = true;
        });
    }

    document.getElementById("media_size").value = safe(r.size);
     disableMediaForm();
}

/* =============================
   AUTO RESIZE + WORD COUNT MEDIA
============================= */

document.addEventListener("DOMContentLoaded", () => {
    // BIO MEDIA — giới hạn 60 chữ
    const mediaBio = document.getElementById("media_bio");
    if (mediaBio) {
        setupTextarea(mediaBio, "media_bio_count", 60);
    }

    // HEALTH MEDIA — giới hạn 60 chữ
    const mediaHealth = document.getElementById("media_health");
    if (mediaHealth) {
        setupTextarea(mediaHealth, "media_health_count", 60);
    }
});

function getInterviewTime(ca) {
    const map = {
        "Ca 1": "08:00 – 11:30 · 13/12/2025",
        "Ca 2": "13:00 – 16:00 · 13/12/2025",
        "Ca 3": "08:00 – 11:30 · 14/12/2025",
        "Ca 4": "13:30 – 19:30 · 14/12/2025",
        "Khác": "Theo sắp xếp riêng từ BTC"
    };

    return map[ca] || "Chưa cập nhật";
}

/* ============================================
   FEEDBACK FLOATING BUTTON + MODAL
============================================ */

let selectedRating = 0;

function initStars() {
    const starsContainer = document.getElementById("ratingStars");
    starsContainer.innerHTML = "";
    selectedRating = 0;
    updateRatingText(0);

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.classList.add("star");
        star.innerHTML = "★";       // ⭐ QUAN TRỌNG!

        star.dataset.value = i;

        // Hover
        star.onmousemove = (e) => {
            const half = e.offsetX < star.clientWidth / 2;
            const value = i - (half ? 0.5 : 0);
            highlightStars(value);
        };

        // Click
        star.onclick = (e) => {
            const half = e.offsetX < star.clientWidth / 2;
            selectedRating = i - (half ? 0.5 : 0);
            highlightStars(selectedRating);
            updateRatingText(selectedRating);
        };

        // Mouse out → giữ rating đã chọn
        star.onmouseleave = () => highlightStars(selectedRating);

        starsContainer.appendChild(star);
    }
}

function highlightStars(rating) {
    const stars = document.querySelectorAll(".star");

    stars.forEach((star, idx) => {
        const index = idx + 1;
        star.classList.remove("full", "half");

        if (rating >= index) {
            star.classList.add("full");
        } else if (rating + 0.5 >= index) {
            star.classList.add("half");
        }
    });
}


function updateRatingText(val) {
    document.getElementById("ratingValue").innerText = `${val} / 5`;
}

function openFeedback() {
    document.getElementById("feedbackModal").style.display = "flex";
    initStars(); // tạo lại hệ thống sao
}

function closeFeedback() {
    document.getElementById("feedbackModal").style.display = "none";
}

document.getElementById("feedbackButton").addEventListener("click", openFeedback);

// Gửi đánh giá
async function submitFeedback() {
    const text = document.getElementById("feedbackText").value.trim();

    if (selectedRating === 0)
        return showToast("Vui lòng chọn số sao!", "warning");

    try {
        const res = await fetch("/api/user/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                rating: selectedRating,
                feedback: text
            })
        });

        if (!res.ok) return showToast("Gửi thất bại!", "error");

        showToast("Cảm ơn bạn đã góp ý ❤️", "success");

        closeFeedback();
        document.getElementById("feedbackText").value = "";

    } catch {
        showToast("Không thể kết nối server!", "error");
    }
}

async function joinOnlineInterview() {
  const res = await fetch("/api/user/interview/status", {
    credentials: "include"
  });

  const data = await res.json();

  if (!data.canJoin || !data.roomId) {
    showToast("Chưa đến lượt phỏng vấn!", "warning");
    return;
  }
  if (data.status === "ended") {
  showToast("Buổi phỏng vấn đã kết thúc", "warning");
  return;
}

  window.open(data.roomId, "_blank");
}

function renderInterviewStatus(status) {
  const map = {
    idle: "Chưa xếp lịch",
    waiting: "Đã xếp lịch",
    calling: "Đang phỏng vấn",
    ended: "Đã kết thúc"
  };
  return map[status] || "Chưa xếp lịch";
}

async function checkRegistrationClosed() {
    try {
        const res = await fetch(API + "/registration/status", {
            credentials: "include"
        });

        if (!res.ok) return;

        const data = await res.json();

        /* ===============================
           LOCAL REGISTRATION
        =============================== */
        if (data.registrationClosed && !data.hasLocalRegistration) {
            const tab = document.getElementById("registration");
            tab.querySelector(".registration-form").style.display = "none";
            tab.querySelector(".registration-closed").style.display = "block";
        }

        /* ===============================
           MEDIA TEAM
        =============================== */
        if (data.registrationClosed && !data.hasMediaRegistration) {
            const tab = document.getElementById("mediaTeam");
            tab.querySelector(".media-form").style.display = "none";
            tab.querySelector(".registration-closed").style.display = "block";
        }

    } catch (err) {
        console.error("checkRegistrationClosed error:", err);
    }
}

