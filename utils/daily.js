const axios = require("axios");

const DAILY_API = "https://api.daily.co/v1";
const headers = {
  Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
  "Content-Type": "application/json"
};

exports.createDailyRoom = async (roomName) => {
  try {
    // 1️⃣ Thử lấy room nếu đã tồn tại
    const existing = await axios.get(
      `${DAILY_API}/rooms/${roomName}`,
      { headers }
    );

    return existing.data;

  } catch (err) {
    // Nếu KHÔNG PHẢI lỗi 404 → throw
    if (err.response?.status !== 404) {
      throw err;
    }
  }

  // 2️⃣ Nếu chưa tồn tại → tạo mới
  const res = await axios.post(
    `${DAILY_API}/rooms`,
    {
      name: roomName,
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 giờ
        enable_chat: true,
        start_audio_off: false,
        start_video_off: false
      }
    },
    { headers }
  );

  return res.data;
};
