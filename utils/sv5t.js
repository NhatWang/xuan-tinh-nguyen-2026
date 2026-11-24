const axios = require("axios");

exports.verifyStudentViaSV5T = async (studentId, password) => {
  try {
    const res = await axios.post(
      `${process.env.SV5T_API_URL}/api/integration/verify-student`,
      { studentId, password },
      {
        headers: {
          "Content-Type": "application/json",
          "x-integration-key": process.env.SV5T_INTEGRATION_SECRET
        },
        timeout: 10000
      }
    );

    return { ok: true, student: res.data.student };
  } catch (err) {
    const msg = err.response?.data?.message || "Không thể kết nối hệ thống SV5T";
    return { ok: false, status: err.response?.status || 503, message: msg };
  }
};
