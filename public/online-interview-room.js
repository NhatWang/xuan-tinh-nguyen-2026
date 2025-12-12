const API = "/api";

let api = null;
let regId = null;
let roomName = null;

/* ==========================
   LẤY QUERY PARAM
========================== */
const params = new URLSearchParams(window.location.search);
regId = params.get("regId");

if (!regId) {
  alert("Thiếu regId!");
  window.close();
}

/* ==========================
   KHỞI TẠO PHÒNG
========================== */
async function initRoom() {
  // 1️⃣ Lấy info registration
  const res = await fetch(API + `/admin/registration/${regId}`, {
    credentials: "include"
  });

  if (!res.ok) {
    alert("Không tải được dữ liệu!");
    return;
  }

  const data = await res.json();
  const user = data.user;
  const reg = data.reg;

  roomName = `XTN2026_${regId}`;

  document.getElementById("roomInfo").textContent =
    `Phỏng vấn: ${user.fullName} (${user.studentId})`;

  // 2️⃣ Update trạng thái: calling
  await fetch(API + `/admin/interview-status/${regId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      interviewStatus: "calling",
      interviewRoomId: roomName,
      interviewStartedAt: new Date()
    })
  });

  // 3️⃣ Tạo Jitsi
  api = new JitsiMeetExternalAPI("meet.jit.si", {
    roomName,
    parentNode: document.querySelector("#jitsi"),
    width: "100%",
    height: "100%",
    userInfo: {
      displayName: "Admin – Phỏng vấn"
    },
    configOverwrite: {
      prejoinPageEnabled: false
    }
  });

  // 4️⃣ Lắng nghe khi rời phòng
  api.addListener("readyToClose", endInterview);
}

initRoom();

/* ==========================
   KẾT THÚC PHỎNG VẤN
========================== */
async function endInterview() {
  if (api) api.dispose();

  await fetch(API + `/admin/interview-status/${regId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      interviewStatus: "ended",
      interviewEndedAt: new Date()
    })
  });

  window.close();
}
