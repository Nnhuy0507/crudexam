# CRUDExam — Hồ sơ người dùng

Ứng dụng Expo SDK 58 / React Native, chạy trên web, Android và iOS. Backend Express kết nối MongoDB `crud_exam`.

## Chức năng hiện tại

- Đăng ký bằng họ tên, email, mật khẩu và ảnh đại diện từ thiết bị.
- Đăng nhập, khôi phục phiên và đăng xuất.
- Hiển thị hồ sơ cá nhân, cập nhật họ tên và ảnh đại diện.
- Chọn và xem trước ảnh trên web/điện thoại; lưu ảnh vào MongoDB trong `hinhanh` dưới dạng data URI. Hỗ trợ JPG/PNG/WebP tối đa 2 MB.
- Phân hệ admin: danh sách có tìm kiếm/phân trang, chi tiết, thêm, sửa, xóa có xác nhận và tải ảnh từ thiết bị.
- Đã bỏ màn hình và API sản phẩm.

## Dữ liệu theo đề

Collection `users` gồm đúng bốn trường nghiệp vụ: `email`, `matkhau`, `hoten`, `hinhanh`, cùng `_id` do MongoDB tự sinh. `matkhau` lưu bản băm scrypt và không trả về client. Ứng dụng hiển thị mật khẩu dạng che. Phiên đăng nhập lưu riêng trong `auth_sessions`, không thêm trường vào hồ sơ người dùng.

## Chạy ứng dụng

```powershell
npm install
npm --prefix backend install
```

Thiết lập `backend/.env` theo `backend/.env.example` và bật MongoDB local hoặc dùng Atlas:

```dotenv
PORT=3002
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=crud_exam
ADMIN_EMAIL=nhuy040705@gmail.com
```

```powershell
npm --prefix backend run db:check
npm --prefix backend start
```

Mở terminal khác, cấu hình `.env` ở thư mục gốc:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3002
```

```powershell
npm run web
```

Android emulator dùng `http://10.0.2.2:3002`; điện thoại thật dùng IP LAN của máy tính, cùng Wi-Fi. Chạy `npm start` rồi mở bằng Expo Go để kiểm tra điện thoại. Khởi động lại Expo và backend sau khi đổi cấu hình. Deploy qua Internet cần HTTPS.

Thư viện chọn ảnh được cài bằng `npx expo install expo-image-picker` và có sẵn trong Expo Go. Với development build riêng cần build lại sau khi thêm module native.

## Cấu trúc

```text
src/app/                 Route đăng nhập, đăng ký và hồ sơ
src/features/account/   Giao diện, context và lưu phiên
backend/                API, kết nối MongoDB, xác thực, kiểm thử
```

## Kiểm tra

```powershell
npm run lint
npx tsc --noEmit
npm --prefix backend test
```

Backend test cần MongoDB hoạt động; tạo và dọn tài khoản kiểm thử riêng. Bộ kiểm thử xác minh schema, băm mật khẩu, đăng nhập/đăng xuất, hết hạn phiên, lưu ảnh, giới hạn ảnh và giới hạn quyền sửa hồ sơ.

## Chuẩn bị nộp bài

```powershell
npm --prefix backend run db:export
```

Lệnh xuất `backend/data/users.json` với đúng bốn trường theo đề; dùng tài khoản demo để làm dữ liệu nộp, không nộp thông tin cá nhân thật. Có thể import JSON bằng MongoDB Compass dạng JSON array.

Phần cần chuẩn bị khi nộp: báo cáo các bước, ảnh minh họa giao diện web/điện thoại và MongoDB Compass, link GitHub và video demo.

## Quản trị

`ADMIN_EMAIL` trong `backend/.env` xác định email tài khoản quản trị đã đăng ký. Khởi động lại backend, đăng xuất rồi đăng nhập lại để nhận quyền. Admin được đưa đến `/users`; tài khoản thường chỉ được xem/sửa hồ sơ của mình. Không có trường vai trò trong collection users; `isAdmin` trong API được tính từ cấu hình backend. Không cho xóa hoặc đổi email của admin đang được cấu hình. Đổi mật khẩu người dùng từ admin sẽ thu hồi các phiên đăng nhập của người đó.

Các trang: `/users`, `/users/new`, `/users/[id]`, `/users/[id]/edit`, `/profile`. Trang chi tiết và chỉnh sửa lấy dữ liệu theo ID từ API nên mở trực tiếp hoặc tải lại trang đều được.

Tài khoản từ phiên bản cũ có thể chuyển tên trường bằng `npm --prefix backend run db:migrate-users`. Script chuyển `name` → `hoten`, `password_hash` → `matkhau`, thêm `hinhanh` nếu thiếu; băm mật khẩu cũ dạng văn bản. Dữ liệu sản phẩm cũ không bị xóa nhưng không còn được ứng dụng sử dụng.
