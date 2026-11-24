# Xuân Tình Nguyện 2026 — Tổng quan hệ thống

Hệ thống đăng ký & tuyển tình nguyện viên — "Xuân Tình Nguyện 2026", do Liên chi Hội
khoa Hóa học tổ chức nhưng **mở cho sinh viên mọi khoa/trường**, không giới hạn khoa Hóa.
Gồm: đăng ký tài khoản, 2 nhánh ứng tuyển (Hậu cần/địa phương & Truyền thông),
dashboard admin duyệt hồ sơ, xếp hàng phỏng vấn trực tiếp, phỏng vấn online qua
Daily.co (video call), upload ảnh 3x4 sau khi đậu, và tính năng feedback sao.

## 1. Kiến trúc tổng thể

- **Backend**: Node.js + Express 5, MongoDB (Mongoose), Socket.io (real-time), JWT (cookie httpOnly) cho auth.
- **Đăng nhập**: đăng ký thủ công (email+password, mọi khoa/trường) là luồng chính; đăng nhập nhanh qua
  **SV5T** (Hành trình cùng nhau 5 Tốt, `cungnhau5tot.id.vn`) là **tùy chọn**, chỉ áp dụng được cho sinh viên khoa Hóa vì đó là phạm vi của SV5T — xem mục 1b.
- **Frontend**: HTML/CSS/JS thuần, phục vụ tĩnh từ `public/`.
- **PDF export**: Puppeteer render HTML template (`templates/`) ra PDF.
- **Ảnh 3x4**: Multer (nhận upload) + Sharp (resize/crop 300x400).
- **Video call**: Daily.co REST API tạo room, Socket.io báo realtime "có người gọi"/"kết thúc".
- **Email**: Mailtrap API (quên mật khẩu) — chỉ dùng cho luồng đăng ký thủ công. Đăng ký **không yêu cầu xác minh email** (dùng được ngay sau khi đăng ký).

```
server.js
├─ config/        kết nối DB, (admin avatar map — hiện không dùng)
├─ routes/        định nghĩa endpoint, gắn middleware
├─ controllers/   logic xử lý
├─ models/        schema Mongoose
├─ middleware/    auth, admin-only, upload ảnh 3x4
├─ utils/         JWT, gửi email, gọi API SV5T, Daily.co
├─ templates/     HTML dùng để render PDF
└─ public/        toàn bộ frontend (login, dashboard, admin, tracker...)
```

## 1b. Hai cách đăng nhập: đăng ký thủ công (mặc định) + SV5T (tùy chọn, chỉ khoa Hóa)

**Quan trọng:** XTN dành cho sinh viên mọi khoa/trường, còn SV5T chỉ quản lý sinh viên khoa Hóa.
Vì vậy KHÔNG thể bắt buộc đăng nhập qua SV5T — nó chỉ là một lối tắt tiện lợi cho đúng nhóm
sinh viên khoa Hóa đã có tài khoản SV5T; mọi sinh viên khác bắt buộc dùng đăng ký thủ công.

**A. Đăng ký thủ công (`register.html` → `login.html`, mọi khoa/trường)**
- `POST /api/auth/register`: nhận `fullName, className, faculty, university, studentId, email, phone, password` (bcrypt hash), set `profileCompleted: true` ngay (đã đủ email/phone). **Không xác minh email** — dùng được ngay.
- `POST /api/auth/login`: email + password.
- `POST /api/auth/forgot-password` + `PUT /api/auth/reset-password/:token`: luồng quên mật khẩu qua email (`forgot.html`/`reset.html`).

**B. Đăng nhập nhanh qua SV5T (tùy chọn, nút trên `login.html`/`admin-login.html`, chỉ khoa Hóa)**
- Kiểu "Đăng nhập bằng Google/Zalo" — app này **không bao giờ nhận mật khẩu SV5T**. Nút redirect sang trang đăng nhập thật của SV5T (`student.html`/`admin.html` trên `cungnhau5tot.id.vn`), kèm `redirect_uri` (= `oauth-callback.html` của app này) và `state` (random, chống CSRF, lưu tạm ở `sessionStorage`).
- User đăng nhập trên chính domain SV5T. Thành công → SV5T cấp 1 **authorization code** ngắn hạn (60s, dùng 1 lần, lưu in-memory phía SV5T — `Utils/oauthStore.js`) rồi redirect về `redirect_uri?code=...&state=...`.
- `oauth-callback.html` kiểm tra `state` khớp, gọi `POST /api/auth/oauth-callback` với `{code}`.
- Backend đổi code lấy thông tin tài khoản bằng `POST <SV5T_API_URL>/api/integration/oauth/token` (server-to-server, header `x-integration-key: SV5T_INTEGRATION_SECRET`, phải khớp `INTEGRATION_SECRET` bên SV5T). Response cho biết `type: "student"|"admin"` kèm dữ liệu tương ứng.
- `type: "student"` → tự tạo/đồng bộ `fullName`/`className` cho `User` theo `studentId`; `faculty`/`university` tự điền cứng `"Hóa học"` / `"Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"` (vì SV5T chỉ quản lý đúng nhóm này, không cần hỏi lại). `type: "admin"` → tự tạo/promote `User` theo `username` với `role: "admin"`, `profileCompleted: true` ngay (admin không cần hoàn tất hồ sơ).
- Phía SV5T, `redirect_uri` được kiểm tra qua whitelist env `OAUTH_ALLOWED_REDIRECTS` (chặn open-redirect) — xem `Routes/oauthRoutes.js` (cấp code) và `Routes/integrationRoutes.js` (đổi code).
- Tài khoản participant vào qua SV5T chưa có email/phone (`profileCompleted: false`) → chuyển sang `complete-profile.html` chỉ hỏi 2 trường này (khoa/trường đã tự điền sẵn).

**Chung cho cả 2 luồng:**
- `User.email/phone` (đăng ký thủ công) và `User.studentId/username` (SV5T) đều `unique+sparse` — một `User` chỉ có 1 trong 2 bộ định danh tùy theo cách đăng nhập, không bắt buộc có cả 2.
- 2 luồng tạo ra các `User` document độc lập (không tự động liên kết) — một sinh viên khoa Hóa đăng ký thủ công rồi sau đó đăng nhập qua SV5T sẽ có 2 tài khoản riêng nếu dùng email khác MSSV.

## 2. Luồng người dùng (candidate)

1. **Đăng ký** (`register.html`, mọi khoa/trường) → **đăng nhập ngay** (`login.html`) bằng email+password (không cần xác minh email) → JWT lưu cookie.
   - Riêng sinh viên khoa Hóa có thêm lựa chọn **đăng nhập nhanh qua SV5T** (nút trên `login.html`) — vào thẳng, không cần đăng ký trước; nếu chưa có email/phone sẽ được yêu cầu bổ sung ở `complete-profile.html`.
2. **Dashboard** (`dashboard.html`):
   - Điền hồ sơ ứng tuyển **Hậu cần** (nv1–nv6: nguyện vọng xếp hạng, kỹ năng, size áo, xe/license, sức khỏe...).
   - Điền hồ sơ ứng tuyển **Truyền thông** (vai trò: Tư liệu/Thiết kế/Content, địa điểm team).
   - Theo dõi trạng thái hồ sơ, kết quả phỏng vấn.
   - Nếu phỏng vấn online: poll trạng thái (`idle/waiting/calling/ended`) để bấm "vào phòng".
   - Gửi **feedback** (đánh giá sao 1–5 + bình luận).
4. **Nếu đậu** (`interviewResult` bắt đầu bằng "Đậu NV"): được phép **upload ảnh 3x4** (crop/resize tự động).
5. **Theo dõi lượt phỏng vấn** (`tracker.html`): trang công khai, không cần đăng nhập, hiển thị thứ tự hàng đợi theo team/địa điểm.

> Lưu ý: bước 1–2 đã thay đổi so với trước — xem mục 1b.

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
| POST | `/register` | Đăng ký thủ công (mọi khoa/trường) — dùng được ngay, không cần xác minh email |
| POST | `/login` | Đăng nhập email+password, set cookie JWT |
| POST | `/forgot-password` | Gửi email đặt lại mật khẩu |
| PUT | `/reset-password/:token` | Đặt mật khẩu mới |
| POST | `/oauth-callback` | Đổi authorization code (redirect từ SV5T, tùy chọn — khoa Hóa) ra session — set cookie JWT |
| PUT | `/complete-profile` | Bổ sung email/phone/faculty/university (cho tài khoản vào qua SV5T) *(auth)* |
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

**User**: `fullName, className, faculty, university` — `email(unique, sparse), phone(unique, sparse), password(hash)` (đăng ký thủ công) — `studentId(unique, sparse), username(unique, sparse — admin)` (đồng bộ từ SV5T mỗi lần đăng nhập qua SV5T) — `profileCompleted, role(participant|admin), photo3x4, resetPasswordToken/Expire`
*(không còn lưu password — xác thực uỷ quyền hoàn toàn cho SV5T)*

**Registration** (Hậu cần, unique theo `userId`):
`dob, gender, facebook, address, nv1–nv6, major, skills[], size, bio, health, cdtn, vehicle, license, lab, interviewLocation, interviewNote, interviewResult, interviewer, attendance, interviewOrder, interviewStatus(idle|waiting|calling|ended), interviewRoomId, interviewStartedAt, interviewEndedAt`

**MediaRegistration** (Truyền thông, unique theo `userId`):
`gender, dob, facebook, address, major, bio, health, cdtn, vehicle, license, mediaRoles[], mediaLocations[], size, interviewNote, interviewResult, interviewer`
*(không có attendance/queue/online-interview — nhánh này phỏng vấn thủ công, trực tiếp)*

**Feedback**: `userId, fullName (snapshot), rating(1-5), comment, createdAt`

## 6. Trang frontend (`public/`)

| File | Vai trò |
|---|---|
| `login.html` | Đăng nhập email+password + nút tùy chọn "Đăng nhập nhanh bằng SV5T" |
| `register.html` | Đăng ký tài khoản thủ công (mọi khoa/trường) |
| `forgot.html` / `reset.html` | Quên / đặt lại mật khẩu |
| `admin-login.html` | Nút redirect sang SV5T đăng nhập admin (OAuth, tùy chọn — khoa Hóa) |
| `oauth-callback.html` | Nhận `code` từ SV5T, đổi lấy session của app này |
| `complete-profile.html` | Bổ sung email/phone/khoa/trường (cho tài khoản vào qua SV5T) |
| `dashboard.html` | Trang chính của ứng viên: hồ sơ, nộp đơn, feedback |
| `admin-dashboard.html` | Toàn bộ công cụ quản trị |
| `online-interview-room.html` | Phòng phỏng vấn video (Daily.co) |
| `tracker.html` | Theo dõi hàng đợi phỏng vấn (công khai) |

## 7. Điểm cần lưu ý

- **2 pipeline ứng tuyển độc lập** (Hậu cần vs Truyền thông): mỗi nhánh có model, route, PDF template riêng; chỉ Hậu cần có điểm danh/hàng đợi/phỏng vấn online.
- **Cơ chế hàng đợi**: nhóm theo `nv1` (team) + `interviewLocation` (buổi); check-in gán số thứ tự tăng dần trong nhóm; bỏ check-in hoặc chuyển "Chờ duyệt" sẽ **xếp lại toàn bộ thứ tự** của nhóm đó.
- **Upload ảnh 3x4 bị khoá** trừ khi `interviewResult` bắt đầu bằng "Đậu NV" — kiểm tra ở backend (`userController.uploadPhoto3x4`), không chỉ ở UI.
- **`GET /api/interview-queue` không có auth** — public theo thiết kế (để `tracker.html` hoạt động không cần đăng nhập), nhưng lộ họ tên + MSSV ứng viên cho bất kỳ ai gọi API.
- **`GET /api/registration/status` đang hardcode** `registrationClosed = true`, biến môi trường `REGISTRATION_CLOSED` hiện bị bỏ qua ở endpoint này (có comment trong code ghi chú việc này).
- **`config/adminAvatar.js` là dead code** — mapping email→avatar admin bị trùng lặp viết thẳng trong `public/admin-dashboard.js` thay vì dùng file config này.
- **Avatar admin** (`public/admin-dashboard.js`): map theo cả `email` (admin đăng ký thủ công) lẫn `username` (admin đăng nhập qua SV5T, vd `lch_admin`), serve từ chính server (`/avatars/...`) — trước đó trỏ nhầm sang 1 domain Railway cũ đã ngừng hoạt động (404) và chỉ map theo email nên admin vào qua SV5T luôn hiện ảnh mặc định.
- **Bug nghiêm trọng đã fix**: `admin-dashboard.js` từng có dòng `window.openPhotoModal = openPhotoModal;` tham chiếu tới 1 hàm chưa từng được định nghĩa → ném `ReferenceError` ngay khi load script, làm **toàn bộ code phía sau trong file không bao giờ chạy** (kể cả lệnh gọi `initAdmin()` → `checkAdmin()`/`loadUsers()`). Đây là nguyên nhân thật của cả avatar trống lẫn danh sách hồ sơ rỗng trên trang admin, không phải do cache trình duyệt. Đã bổ sung định nghĩa `openPhotoModal`/`closePhotoModal` (modal xem ảnh 3x4) còn thiếu.
- **Socket.io** chỉ dùng cho báo hiệu phỏng vấn online (`interview:calling`, `interview:ended`), không dùng cho chat hay cập nhật hàng đợi real-time.
- **PDF xuất bằng Puppeteer** (headless Chrome) render HTML có nhúng font tiếng Việt base64, không dùng thư viện PDF riêng — cần Chromium khi deploy (xem `render.yaml`).
- **2 luồng đăng nhập tạo `User` độc lập, không tự liên kết**: một sinh viên khoa Hóa đăng ký thủ công (email X) rồi sau đó bấm "Đăng nhập nhanh bằng SV5T" sẽ có 2 tài khoản khác nhau trong DB (trừ khi chủ động không dùng SV5T, hoặc về sau có cơ chế liên kết tài khoản).

## 8. Biến môi trường cần thiết

| Biến | Dùng cho |
|---|---|
| `MONGO_URI` | Kết nối MongoDB Atlas |
| `JWT_SECRET` | Ký/verify JWT |
| `MAILTRAP_TOKEN`, `FROM_EMAIL` | Gửi email quên mật khẩu (đăng ký thủ công) |
| `CLIENT_URL` | URL frontend, dùng trong link email reset mật khẩu |
| `SV5T_API_URL` | Base URL hệ thống SV5T (vd `https://cungnhau5tot.id.vn`) — cho đăng nhập nhanh tùy chọn (chỉ khoa Hóa) |
| `SV5T_INTEGRATION_SECRET` | Secret dùng chung với `INTEGRATION_SECRET` bên SV5T — phải khớp giá trị |
| `DAILY_API_KEY` | Tạo phòng video call Daily.co |
| `REGISTRATION_CLOSED` | Đóng/mở nhận đăng ký mới *(hiện bị override cứng ở 1 endpoint — xem mục 7)* |
| `PORT` | Cổng server (Render tự set) |
