# QC Management App (ISSUE QC 2)

Hệ thống quản lý sự cố chất lượng (QC Report).

## Cấu trúc thư mục
- `backend/`: Node.js Express server với Sequelize (PostgreSQL).
- `frontend/`: React + Vite + Tailwind CSS dashboard.
- `sql/`: File schema database.

## Hướng dẫn cài đặt

### 1. Database
- Tạo database PostgreSQL tên là `qc_db`.
- Chạy các câu lệnh SQL trong `sql/schema.sql` để tạo bảng.

### 2. Backend
- Vào thư mục `backend`: `cd backend`
- Cài đặt dependencies: `npm install`
- Copy `.env.example` thành `.env` và cập nhật thông tin database.
- Chạy server: `npm start`
- Hoặc chạy mode dev: `npm run dev` (yêu cầu nodemon)
- **Lưu ý:** Có thể gọi `POST /api/seed` để tạo dữ liệu mẫu.

### 3. Frontend
- Vào thư mục `frontend`: `cd frontend`
- Cài đặt dependencies: `npm install`
- Chạy app: `npm run dev`
- Truy cập ứng dụng tại `http://localhost:5173`.

## Các tính năng chính
- Danh sách sự cố (Issue List) với màu sắc theo trạng thái.
- Badge trạng thái: NEW (Đỏ), PENDING (Vàng), DONE (Xanh).
- Tự động kiểm tra các issue quá hạn (7 ngày không cập nhật) qua Cron Job.
- Thông báo (Notifications) và giả lập Push Notification (FCM).
