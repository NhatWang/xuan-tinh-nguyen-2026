/* =====================================================
   ONLINE INTERVIEW ROOM – DAILY.CO (ADMIN)
===================================================== */

let callFrame = null;
let roomUrl = null;
let interviewStarted = false;

/* =========================
   GET REG ID FROM URL
========================= */
const params = new URLSearchParams(window.location.search);
const regId = params.get("reg");

if (!regId) {
  alert("Thiếu mã đăng ký (regId)");
  window.close();
}

/* ============================================
   INIT ROOM (CHỈ LOAD INFO – KHÔNG JOIN)
============================================ */
async function initRoom() {
  try {
    const res = await fetch(`/api/admin/interview/room/${regId}`, {
      credentials: "include"
    });

    if (!res.ok) {
      alert("Không thể tải thông tin phỏng vấn");
      window.close();
      return;
    }

    const data = await res.json();

    document.getElementById("roomInfo").innerText =
      `Phỏng vấn: ${data.user.fullName} (${data.user.studentId})`;

  } catch (err) {
    console.error("initRoom error:", err);
    alert("Lỗi tải phòng phỏng vấn");
    window.close();
  }
}

/* ============================================
   START INTERVIEW (ADMIN BẤM NÚT)
============================================ */
async function startInterview() {
  if (interviewStarted) return;

  try {
    // 1️⃣ CALL API START
    const res = await fetch(`/api/admin/interview/start/${regId}`, {
      method: "PUT",
      credentials: "include"
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.msg || "Không thể bắt đầu phỏng vấn");
      return;
    }

    const data = await res.json();
    roomUrl = data.room; // ✅ FULL DAILY URL
    interviewStarted = true;

    // 2️⃣ CREATE DAILY FRAME
    callFrame = window.DailyIframe.createFrame({
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0"
      }
    });

    // 3️⃣ APPEND iframe → DOM
    const container = document.getElementById("daily");
    if (!container) {
      alert("Thiếu div#daily");
      return;
    }

    container.appendChild(callFrame.iframe);

    // 4️⃣ JOIN ROOM
    await callFrame.join({ url: roomUrl });

    // 5️⃣ EVENT LISTENER (KHÔNG AUTO END)
    callFrame.on("left-meeting", () => {
      console.warn("Admin rời phòng (không auto end)");
    });

    // 6️⃣ DISABLE START BUTTON
    const startBtn = document.querySelector(".start-btn");
    if (startBtn) startBtn.disabled = true;

  } catch (err) {
    console.error("startInterview error:", err);
    alert("Lỗi khi bắt đầu phỏng vấn");
  }
}

/* ============================================
   END INTERVIEW (ADMIN BẤM)
============================================ */
async function endInterview() {
  if (!interviewStarted) return;

  interviewStarted = false;

  try {
    if (callFrame) {
      callFrame.destroy();
      callFrame = null;
    }

    await fetch(`/api/admin/interview/end/${regId}`, {
      method: "PUT",
      credentials: "include"
    });

  } catch (err) {
    console.error("endInterview error:", err);
  }

  window.close();
}

/* ============================================
   SAFETY: ADMIN ĐÓNG TAB / REFRESH
============================================ */
window.addEventListener("beforeunload", () => {
  if (interviewStarted) {
    navigator.sendBeacon(
      `/api/admin/interview/end/${regId}`
    );
  }
});

/* ============================================
   INIT
============================================ */
document.addEventListener("DOMContentLoaded", initRoom);
