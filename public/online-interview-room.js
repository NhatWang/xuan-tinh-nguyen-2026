let callFrame = null;
let roomUrl = null;
let interviewStarted = false;
const params = new URLSearchParams(window.location.search);
const regId = params.get("reg");

/* ============================================
   INIT ROOM (CHỈ LOAD INFO – KHÔNG JOIN)
============================================ */
async function initRoom() {
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
}

/* ============================================
   START INTERVIEW (ADMIN CHỦ ĐỘNG)
============================================ */
async function startInterview() {
  if (interviewStarted) return;

  const res = await fetch(`/api/admin/interview/start/${regId}`, {
    method: "PUT",
    credentials: "include"
  });

  if (!res.ok) {
    alert("Không thể bắt đầu phỏng vấn");
    return;
  }

  const data = await res.json();
  roomUrl = data.room; // ✅ FULL Daily URL
  interviewStarted = true;

  callFrame = window.DailyIframe.createFrame({
    iframeStyle: {
      width: "100%",
      height: "100%"
    }
  });

  document.getElementById("daily").appendChild(callFrame.iframe);

  await callFrame.join({ url: roomUrl });

  // ❌ KHÔNG auto end khi left-meeting
  callFrame.on("left-meeting", () => {
    console.warn("Admin rời phòng (không auto end)");
  });
}

/* ============================================
   END INTERVIEW (ADMIN BẤM)
============================================ */
async function endInterview() {
  if (!interviewStarted) return;

  interviewStarted = false;

  if (callFrame) {
    callFrame.destroy();
    callFrame = null;
  }

  await fetch(`/api/admin/interview/end/${regId}`, {
    method: "PUT",
    credentials: "include"
  });

  window.close();
}

/* ============================================
   SAFETY: ADMIN ĐÓNG TAB ĐỘT NGỘT
============================================ */
window.addEventListener("beforeunload", async () => {
  if (interviewStarted) {
    navigator.sendBeacon(
      `/api/admin/interview/end/${regId}`
    );
  }
});
