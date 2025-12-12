const API = "/api";

let api = null;
let regId = null;
let roomName = null;

/* ==========================
   LẤY QUERY PARAM (FIX)
========================== */
const params = new URLSearchParams(window.location.search);
regId = params.get("reg");   // ✅ FIX

if (!regId) {
  alert("Thiếu regId!");
  window.close();
}

/* ==========================
   KHỞI TẠO PHÒNG
========================== */
async function initRoom() {
  // 1️⃣ Lấy info phòng (API ĐÚNG)
  const res = await fetch(API + `/admin/interview/room/${regId}`, {
    credentials: "include"
  });

  if (!res.ok) {
    alert("Không tải được dữ liệu phòng!");
    return;
  }

  const data = await res.json();
  const { user, reg } = data;
    if (!user || !reg) {
    alert("Dữ liệu phỏng vấn không hợp lệ!");
    return;
    }
  const roomId = data.roomId || `room-${regId}`;

  roomName = roomId;

  document.getElementById("roomInfo").textContent =
    `Phỏng vấn: ${user.fullName} (${user.studentId})`;

  // 2️⃣ BÁO BẮT ĐẦU PHỎNG VẤN
  await fetch(API + `/admin/interview/start/${regId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
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

  // 4️⃣ Khi đóng phòng
  api.addListener("readyToClose", endInterview);
}

initRoom();

/* ==========================
   KẾT THÚC PHỎNG VẤN
========================== */
async function endInterview() {
  if (api) api.dispose();

  await fetch(API + `/admin/interview/end/${regId}`, {
    method: "PUT",
    credentials: "include"
  });

  window.close();
}
