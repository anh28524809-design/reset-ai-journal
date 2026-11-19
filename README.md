# RESET-AI | Hồ sơ và Nhật ký nghiên cứu khoa học

Ứng dụng web (React + TypeScript + Firebase) số hóa hồ sơ và nhật ký nghiên cứu của dự án
**“Nghiên cứu hành vi tìm đến AI trước khi tự thử giải bài tập và thử nghiệm trạm RESET-AI nhằm tái hình thành thói quen tư duy độc lập cho học sinh Trường THPT Chuyên Bắc Kạn”** — lĩnh vực Khoa học xã hội và hành vi.

> Đây là hồ sơ tổng hợp bổ sung từ quá trình nghiên cứu đã thực hiện, **không** phải nhật ký ghi trực tiếp tại thời điểm hoạt động. Ứng dụng không chứa dữ liệu mẫu.

## Chức năng

| Trang | Nội dung |
|---|---|
| Tổng quan | Thông tin dự án, 4 chỉ số tính từ dữ liệu thật, hành trình 6 giai đoạn, minh chứng nổi bật đã duyệt |
| Tiến trình nghiên cứu | Timeline dọc 6 giai đoạn; giáo viên sửa, thêm, sắp xếp hoạt động và phân công |
| Nhật ký và minh chứng | Đủ 20 trường nhật ký, mã tự động, 3 chế độ xem, tải nhiều tệp có tiến trình, xem trước ảnh/video toàn màn hình |
| Kết quả nghiên cứu | 3 phần; biểu đồ cột / tỷ lệ / bảng có đơn vị, cỡ mẫu, nguồn, thời điểm; dữ liệu gốc lưu vùng riêng tư |
| Hồ sơ khoa học | Phụ lục II–IX; xuất nhật ký đúng các cột Phụ lục VIII ra Word (.docx) |

Chức năng quản trị (chỉ giáo viên, mở từ menu tài khoản): cấp quyền thành viên, nhập 16 dòng từ Phụ lục VIII (dạng *nội dung hồi cứu*, *bản nháp*), sửa thông tin dự án, sao lưu JSON.

## Tính trung thực của dữ liệu (thực thi bằng Security Rules)

- Ngày nhập hệ thống, thời điểm xác nhận, lịch sử thay đổi: do máy chủ ghi (`request.time`), không sửa được.
- Sau khi giáo viên xác nhận, mọi chỉnh sửa bắt buộc lưu phiên bản cũ vào `entries/{id}/versions` (chỉ thêm, không sửa/xóa) và chuyển về “chờ xác nhận lại”.
- Giám khảo (không đăng nhập) chỉ đọc được `public_entries`, `public_evidence` và kết quả/hồ sơ đã công bố.
- Minh chứng có thông tin định danh người tham gia không thể công bố; tệp dữ liệu gốc nằm trong `private/`.
- Mỗi nhật ký ghi rõ nguồn gốc: dữ liệu gốc / nội dung hồi cứu / nội dung suy luận, và mức độ chắc chắn của thời gian.
- Không tạo chữ ký; ô ký trong tệp Word để trống.

## Cấu hình Firebase (một lần)

1. Tạo dự án tại <https://console.firebase.google.com>.
2. **Authentication** → bật nhà cung cấp **Google**; thêm tên miền GitHub Pages (`<tài-khoản>.github.io`) vào *Authorized domains*.
3. **Firestore Database** → tạo database (production mode).
4. **Storage** → Get started (dự án mới cần gói Blaze; có hạn mức miễn phí).
5. Triển khai rules:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add            # chọn dự án vừa tạo
   firebase deploy --only firestore:rules,storage
   ```
   Cho phép Storage đọc Firestore khi được hỏi (cross-service rules).
6. **Project settings → Your apps → Web app**: lấy 6 giá trị cấu hình.
7. GitHub repo → **Settings → Secrets and variables → Actions → Variables**: tạo
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
   rồi chạy lại workflow **Deploy to GitHub Pages** (tab Actions → Run workflow).
8. Tạo quản trị viên đầu tiên: Firestore → collection `roles` → document ID = email Google của giáo viên (chữ thường), trường `role: "teacher"`, `name: "Vũ Thúy Mai"`. Giáo viên đăng nhập và cấp quyền học sinh trong trang Quản trị. Tên học sinh phải trùng với tên trong nhật ký (`Vương Đức Anh`, `Đàm Khánh An`).

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền cấu hình Firebase
npm run dev
```

## Triển khai

Mỗi lần push lên nhánh `main`, GitHub Actions build và đăng lên GitHub Pages (`.github/workflows/deploy.yml`).
