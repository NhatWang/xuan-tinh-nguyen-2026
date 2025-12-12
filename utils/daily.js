const axios = require("axios");

const DAILY_API = "https://api.daily.co/v1";

exports.createDailyRoom = async (roomName) => {
  const res = await axios.post(
    `${DAILY_API}/rooms`,
    {
      name: roomName,
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // sống 1 giờ
        enable_chat: true,
        start_audio_off: false,
        start_video_off: false
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
};
