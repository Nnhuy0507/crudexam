# Backend hồ sơ người dùng

Xem [hướng dẫn chạy toàn bộ dự án](../README.md).

## API

| Phương thức | Đường dẫn | Chức năng |
| --- | --- | --- |
| POST | `/api/auth/register` | Đăng ký, trả token và hồ sơ |
| POST | `/api/auth/login` | Đăng nhập bằng email, matkhau |
| GET | `/api/auth/me` | Lấy hồ sơ đang đăng nhập |
| PUT | `/api/auth/me` | Cập nhật hoten, hinhanh của chính mình |
| POST | `/api/auth/logout` | Thu hồi token |
| GET | `/api/health` | Kiểm tra kết nối MongoDB |

API hồ sơ và đăng xuất yêu cầu header `Authorization: Bearer <token>`. Không có API sản phẩm.

API quản trị yêu cầu đăng nhập và email trùng `ADMIN_EMAIL` ở backend:

- `GET /api/users?search=...&page=1`: tìm tên/email, phân trang 20 người.
- `POST /api/users`: thêm bằng email, matkhau, hoten, hinhanh.
- `GET /api/users/:id`: chi tiết, không trả mật khẩu.
- `PUT /api/users/:id`: sửa thông tin; matkhau để trống giữ nguyên, đổi mật khẩu thu hồi các phiên cũ.
- `DELETE /api/users/:id`: xóa tài khoản và phiên; không cho xóa admin đang được cấu hình.

Khởi động lại backend sau khi đổi ADMIN_EMAIL. Client không thể tự cấp quyền bằng payload. `isAdmin` chỉ là thuộc tính tính toán trong phản hồi API, không được ghi vào MongoDB.

Đăng ký nhận `email`, `matkhau` (6–128 ký tự), `hoten` (1–100 ký tự), `hinhanh` (data URI ảnh hoặc chuỗi rỗng). Backend chỉ ghi những trường cho phép, không ghi role từ client. Email được chuẩn hóa và có index duy nhất; mật khẩu băm bằng scrypt. Ảnh tối đa 2 MB, kiểm tra định dạng, base64 và chữ ký JPG/PNG/WebP.

API trả hồ sơ gồm `id`, `email`, `hoten`, `hinhanh`, không có mật khẩu. ID chỉ là ánh xạ `_id` tự sinh. Mỗi token được băm trong collection phiên riêng, hết hạn sau 7 ngày; kiểm tra hạn ở mỗi yêu cầu.

## Lệnh

```powershell
npm run db:check
npm run db:migrate-users
npm test
npm run db:export
npm start
```

`db:migrate-users` chuyển tên trường cũ và băm mật khẩu văn bản nếu có. `db:export` xuất collection users sang `data/users.json` với bốn trường nghiệp vụ. File export chứa dữ liệu và mật khẩu đã băm, không chia sẻ dữ liệu người dùng thật. Dữ liệu sản phẩm cũ được giữ nguyên, không còn API truy cập.
