# Bioderma Sébium Rebalance Lab

Ứng dụng sự kiện gồm trải nghiệm khách hàng mobile-first và CMS responsive. Dữ liệu thật dùng Firebase Authentication + Firestore; triển khai trên Vercel.

## Chạy thử cục bộ

```bash
npm install
npm run dev
```

Khi chưa có `.env.local`, ứng dụng tự chạy ở chế độ demo bằng `localStorage`:

- Mã Zone 1: `1111`
- Mã Zone 2: `2222`
- Mã Zone 3: `3333`
- CMS: `/bio-admin-9x32/login`, nhập email và mật khẩu bất kỳ.

Chế độ demo chỉ phục vụ kiểm tra giao diện trên một trình duyệt. Không dùng cho sự kiện thật.

## Thiết lập Firebase từng bước

1. Mở Firebase Console và tạo một project mới.
2. Vào **Build > Firestore Database**, chọn **Create database**, chọn khu vực gần Việt Nam và tạo database ở Production mode.
3. Vào **Build > Authentication > Sign-in method**, bật **Email/Password**.
4. Vào **Authentication > Users > Add user**, tạo tài khoản Admin bằng email và mật khẩu mạnh.
5. Vào **Project settings > General > Your apps**, tạo Web App.
6. Sao chép các giá trị `firebaseConfig` vào nhóm biến `NEXT_PUBLIC_FIREBASE_*` trong `.env.local` theo `.env.example`.
7. Vào **Project settings > Service accounts > Generate new private key**. Không commit file JSON này vào Git.
8. Từ JSON service account, điền `project_id`, `client_email`, `private_key` vào `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
9. Điền email Admin đã tạo vào `ADMIN_EMAILS`. Có thể thêm nhiều email, phân cách bằng dấu phẩy.
10. Tạo chuỗi bí mật ngẫu nhiên dài cho `IP_HASH_SALT`.
11. Cài Firebase CLI, đăng nhập và deploy rules:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

12. Chạy lại `npm run dev`, đăng nhập CMS và cấu hình tồn đầu ngày + ba mã zone cho từng ngày.

## Triển khai Vercel từng bước

1. Đưa folder này lên một Git repository riêng tư.
2. Đăng nhập Vercel, chọn **Add New > Project** và import repository.
3. Framework preset chọn **Next.js**; build command giữ mặc định `npm run build`.
4. Trong **Settings > Environment Variables**, thêm toàn bộ biến trong `.env.example` cho Production và Preview.
5. Với `FIREBASE_PRIVATE_KEY`, dán nguyên private key; Vercel hỗ trợ nội dung nhiều dòng.
6. Để kiểm tra trước sự kiện, có thể đặt `ALLOW_EVENT_PREVIEW=true` trên Preview deployment. Production nên để `false` khi chương trình chạy thật.
7. Deploy và thêm domain chính thức nếu có.
8. Trong Firebase Console > Authentication > Settings > Authorized domains, thêm domain Vercel và domain chính thức.
9. Kiểm tra `/bio-admin-9x32/login`, khởi tạo ngày hoạt động, nhập tồn kho/mã Zone, sau đó chạy thử toàn bộ luồng trên một điện thoại.
10. Trước giờ mở sự kiện, xác nhận `ALLOW_EVENT_PREVIEW=false`, tồn kho đúng và mã của từng PG đúng với CMS.

## Quy tắc nghiệp vụ

- Zone 1 không phát sample.
- Zone 2 và Zone 3 mỗi zone phát tối đa một sample cho mỗi người.
- Hai zone dùng chung tồn kho theo từng ngày.
- Khi hết hàng, tiến độ vẫn được ghi nhận và khách vẫn tiếp tục.
- Người không consent vẫn tham gia; hệ thống chỉ lưu mã, giới tính và thời gian.
- `deviceId` + cookie ngăn lặp trên cùng trình duyệt. IP chỉ được băm và dùng làm tín hiệu kiểm tra, không chặn cứng vì nhiều khách có thể dùng chung Wi-Fi.
