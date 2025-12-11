const API = "/api/interview-queue";

const TEAMS = [
    "Đội hình Chồi xuân",
    "Đội hình Khởi xuân an",
    "Đội hình Xuân chiến sĩ",
    "Đội hình Xuân gắn kết",
    "Đội hình Xuân đất thép",
    "Đội hình Xuân Bác Ái"
];

// Lưu HTML cũ → tránh reload nhấp nháy
let lastRenderedHTML = "";

async function loadQueue() {
    try {
        const res = await fetch(API);
        const data = await res.json();

        const tbody = document.getElementById("queueBody");
        let newHTML = "";

        TEAMS.forEach(team => {
            const list = data
                .filter(i => i.nv1 === team)
                .sort((a, b) => a.interviewOrder - b.interviewOrder);

            const current = list[0];
            const next1   = list[1];
            const next2   = list[2];

            newHTML += `
                <tr>
                    <td><b>${team}</b></td>
                    <td>${renderSlot(current, true)}</td>
                    <td>${renderSlot(next1)}</td>
                    <td>${renderSlot(next2)}</td>
                </tr>
            `;
        });

        if (newHTML !== lastRenderedHTML) {
            tbody.innerHTML = newHTML;
            lastRenderedHTML = newHTML;
            console.log("Queue updated!");
        }

        document.getElementById("updateTime").innerText =
            "Cập nhật lúc: " + new Date().toLocaleTimeString();

    } catch (err) {
        console.error("Error loading queue:", err);
    }
}

// ✔ Chỉ hiển thị fullName — MSSV (KHÔNG hiển thị STT)
function renderSlot(item, isCurrent = false) {
    if (!item) return `<span class="empty">—</span>`;

    return `
        <div class="slot ${isCurrent ? "current-slot" : ""}">
            ${item.userId.fullName} — ${item.userId.studentId}
        </div>
    `;
}

// Auto reload
setInterval(loadQueue, 1000);
loadQueue();
