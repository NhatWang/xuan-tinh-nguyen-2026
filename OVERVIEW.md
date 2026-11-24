# Xuân Tình Nguyện 2026 — Tổng quan hệ thống

Hệ thống đăng ký & tuyển thành viên CLB (khoa Hóa học) — "Xuân Tình Nguyện 2026".
Gồm: đăng ký tài khoản, 2 nhánh ứng tuyển (Hậu cần/địa phương & Truyền thông),
dashboard admin duyệt hồ sơ, xếp hàng phỏng vấn trực tiếp, phỏng vấn online qua
Daily.co (video call), upload ảnh 3x4 sau khi đậu, và tính năng feedback sao.

## 1. Kiến trúc tổng thể

- **Backend**: Node.js + Express 5, MongoDB (Mongoose), Socket.io (real-time), JWT (cookie httpOnly) cho auth.
- **Frontend**: HTML/CSS/JS thuần, phục vụ tĩnh từ `public/`.
- **PDF export**: Puppeteer render HTML template (`templates/`) ra PDF.
- **Ảnh 3x4**: Multer (nhận upload) + Sharp (resize/crop 300x400).
- **Video call**: Daily.co REST API tạo room, Socket.io báo realtime "có người gọi"/"kết thúc".
- **Email**: Mailtrap API (xác minh email, quên mật khẩu).

```
server.js
├─ config/        kết nối DB, (admin avatar map — hiện không dùng)
├─ routes/        định nghĩa endpoint, gắn middleware
├─ controllers/   logic xử lý
├─ models/        schema Mongoose
├─ middleware/    auth, admin-only, upload ảnh 3x4
├─ utils/         JWT, gửi email, Daily.co
├─ templates/     HTML dùng để render PDF
└─ public/        toàn bộ frontend (login, dashboard, admin, tracker...)
```

## 2. Luồng người dùng (candidate)

1. **Đăng ký tài khoản** (`register.html`) → nhận email xác minh → `verified-email.html`.
2. **Đăng nhập** (`login.html`) → JWT lưu cookie.
3. **Dashboard** (`dashboard.html`):
   - Điền hồ sơ ứng tuyển **Hậu cần** (nv1–nv6: nguyện vọng xếp hạng, kỹ năng, size áo, xe/license, sức khỏe...).
   - Điền hồ sơ ứng tuyển **Truyền thông** (vai trò: Tư liệu/Thiết kế/Content, địa điểm team).
   - Theo dõi trạng thái hồ sơ, kết quả phỏng vấn.
   - Nếu phỏng vấn online: poll trạng thái (`idle/waiting/calling/ended`) để bấm "vào phòng".
   - Gửi **feedback** (đánh giá sao 1–5 + bình luận).
4. **Nếu đậu** (`interviewResult` bắt đầu bằng "Đậu NV"): được phép **upload ảnh 3x4** (crop/resize tự động).
5. **Theo dõi lượt phỏng vấn** (`tracker.html`): trang công khai, không cần đăng nhập, hiển thị thứ tự hàng đợi theo team/địa điểm.

## 3. Luồng admin

- **Danh sách hồ sơ** theo từng nhánh (Hậu cần / Truyền thông), lọc theo team/địa điểm.
- **Xuất PDF** từng hồ sơ (Puppeteer render `registration_template.html` / `media_template.html`, có mã số thứ tự kiểu `CX-01`, `TT-01`).
- **Chấm phỏng vấn**: ghi chú, kết quả, người phỏng vấn.
- **Quản lý điểm danh & hàng đợi** (chỉ nhánh Hậu cần): check-in → gán số thứ tự theo nhóm (team + địa điểm); bỏ check-in hoặc chuyển kết quả về "Chờ duyệt" → tự xếp lại thứ tự hàng đợi.
- **Phỏng vấn online** (khi địa điểm = "Khác"): tạo room Daily.co, bắt đầu/kết thúc cuộc gọi — bắn Socket.io event cho ứng viên + phòng "admins".
- **Quản lý ảnh 3x4**: xem danh sách, tải toàn bộ (zip) ảnh ứng viên đã đậu.
- **Xem feedback** của toàn bộ ứng viên.

## 4. API Endpoints

### `/api/auth`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/register` | Tạo tài khoản, gửi email xác minh |
| GET | `/verify-email/:token` | Xác minh email |
| POST | `/login` | Đăng nhập, set cookie JWT |
| POST | `/forgot-password` | Gửi email đặt lại mật khẩu |
| PUT | `/reset-password/:token` | Đặt mật khẩu mới |
| POST | `/logout` | Xoá cookie |
| GET | `/me` | Lấy thông tin user hiện tại *(auth)* |

### `/api/registration` — hồ sơ Hậu cần
| Method | Path | Mô tả |
|---|---|---|
| POST | `/` | Nộp hồ sơ (1 người/1 hồ sơ, khoá nếu `REGISTRATION_CLOSED`) *(auth)* |
| GET | `/me` | Lấy hồ sơ của mình *(auth)* |
| GET | `/status` | Trạng thái đóng/mở đăng ký + đã nộp hồ sơ nào *(auth)* |

### `/api/media` — hồ sơ Truyền thông
| Method | Path | Mô tả |
|---|---|---|
| POST | `/` | Nộp hồ sơ truyền thông *(auth)* |
| GET | `/me` | Lấy hồ sơ của mình *(auth)* |

### `/api/admin` — admin, nhánh Hậu cần
| Method | Path | Mô tả |
|---|---|---|
| GET | `/list` | Danh sách toàn bộ hồ sơ *(admin)* |
| GET | `/registration/:regId` | Chi tiết 1 hồ sơ *(admin)* |
| GET | `/export/:regId` | Xuất PDF hồ sơ *(admin)* |
| PUT | `/interview/:regId` | Cập nhật kết quả/ghi chú phỏng vấn *(admin)* |
| PUT | `/attendance/:regId` | Toggle điểm danh, xếp hàng đợi *(admin)* |
| GET | `/feedback/all` | Xem toàn bộ feedback *(admin)* |
| PUT | `/interview/start/:id` | Bắt đầu phỏng vấn online *(admin)* |
| PUT | `/interview/end/:id` | Kết thúc phỏng vấn online *(admin)* |
| GET | `/interview/room/:regId` | Thông tin phòng phỏng vấn online *(admin)* |
| PUT | `/registration/:id/location` | Đổi địa điểm/buổi phỏng vấn *(admin)* |
| GET | `/photos` | Danh sách ảnh 3x4 đã upload *(admin)* |
| GET | `/photos/download` | Tải zip toàn bộ ảnh 3x4 *(admin)* |

### `/api/admin/media` — admin, nhánh Truyền thông
| Method | Path | Mô tả |
|---|---|---|
| GET | `/list` | Danh sách hồ sơ truyền thông *(admin)* |
| GET | `/export/:mediaId` | Xuất PDF hồ sơ truyền thông *(admin)* |
| PUT | `/interview/:id` | Cập nhật kết quả phỏng vấn *(admin)* |

### `/api/interview-queue`
| Method | Path | Mô tả |
|---|---|---|
| GET | `/` | **Công khai**, không cần đăng nhập — hàng đợi phỏng vấn cho `tracker.html` |

### `/api/user`
| Method | Path | Mô tả |
|---|---|---|
| POST | `/upload-photo-3x4` | Upload ảnh 3x4 (chỉ khi đã đậu) *(auth)* |
| POST | `/feedback` | Gửi đánh giá sao + bình luận *(auth)* |
| GET | `/interview/status` | Poll trạng thái phỏng vấn online của mình *(auth)* |

## 5. Data models (MongoDB)

**User**: `fullName, className, faculty, university, studentId, email, phone, password(hash), isVerified, role(participant|admin), photo3x4, resetPasswordToken/Expire, verifyEmailToken/Expire`

**Registration** (Hậu cần, unique theo `userId`):
`dob, gender, facebook, address, nv1–nv6, major, skills[], size, bio, health, cdtn, vehicle, license, lab, interviewLocation, interviewNote, interviewResult, interviewer, attendance, interviewOrder, interviewStatus(idle|waiting|calling|ended), interviewRoomId, interviewStartedAt, interviewEndedAt`

**MediaRegistration** (Truyền thông, unique theo `userId`):
`gender, dob, facebook, address, major, bio, health, cdtn, vehicle, license, mediaRoles[], mediaLocations[], size, interviewNote, interviewResult, interviewer`
*(không có attendance/queue/online-interview — nhánh này phỏng vấn thủ công, trực tiếp)*

**Feedback**: `userId, fullName (snapshot), rating(1-5), comment, createdAt`

## 6. Trang frontend (`public/`)

| File | Vai trò |
|---|---|
| `login.html` | Đăng nhập |
| `register.html` | Đăng ký tài khoản |
| `dashboard.html` | Trang chính của ứng viên: hồ sơ, nộp đơn, feedback |
| `admin-dashboard.html` | Toàn bộ công cụ quản trị |
| `online-interview-room.html` | Phòng phỏng vấn video (Daily.co) |
| `tracker.html` | Theo dõi hàng đợi phỏng vấn (công khai) |
| `forgot.html` / `reset.html` | Quên / đặt lại mật khẩu |
| `verified-email.html` | Trang xác nhận đã verify email |

## 7. Điểm cần lưu ý

- **2 pipeline ứng tuyển độc lập** (Hậu cần vs Truyền thông): mỗi nhánh có model, route, PDF template riêng; chỉ Hậu cần có điểm danh/hàng đợi/phỏng vấn online.
- **Cơ chế hàng đợi**: nhóm theo `nv1` (team) + `interviewLocation` (buổi); check-in gán số thứ tự tăng dần trong nhóm; bỏ check-in hoặc chuyển "Chờ duyệt" sẽ **xếp lại toàn bộ thứ tự** của nhóm đó.
- **Upload ảnh 3x4 bị khoá** trừ khi `interviewResult` bắt đầu bằng "Đậu NV" — kiểm tra ở backend (`userController.uploadPhoto3x4`), không chỉ ở UI.
- **`GET /api/interview-queue` không có auth** — public theo thiết kế (để `tracker.html` hoạt động không cần đăng nhập), nhưng lộ họ tên + MSSV ứng viên cho bất kỳ ai gọi API.
- **`GET /api/registration/status` đang hardcode** `registrationClosed = true`, biến môi trường `REGISTRATION_CLOSED` hiện bị bỏ qua ở endpoint này (có comment trong code ghi chú việc này).
- **`config/adminAvatar.js` là dead code** — mapping email→avatar admin bị trùng lặp viết thẳng trong `public/admin-dashboard.js` thay vì dùng file config này.
- **Socket.io** chỉ dùng cho báo hiệu phỏng vấn online (`interview:calling`, `interview:ended`), không dùng cho chat hay cập nhật hàng đợi real-time.
- **PDF xuất bằng Puppeteer** (headless Chrome) render HTML có nhúng font tiếng Việt base64, không dùng thư viện PDF riêng — cần Chromium khi deploy (xem `render.yaml`).

## 8. Biến môi trường cần thiết

| Biến | Dùng cho |
|---|---|
| `MONGO_URI` | Kết nối MongoDB Atlas |
| `JWT_SECRET` | Ký/verify JWT |
| `MAILTRAP_TOKEN`, `FROM_EMAIL` | Gửi email xác minh / quên mật khẩu |
| `DAILY_API_KEY` | Tạo phòng video call Daily.co |
| `CLIENT_URL` | URL frontend (dùng trong link email) |
| `REGISTRATION_CLOSED` | Đóng/mở nhận đăng ký mới *(hiện bị override cứng ở 1 endpoint — xem mục 7)* |
| `PORT` | Cổng server (Render tự set) |
