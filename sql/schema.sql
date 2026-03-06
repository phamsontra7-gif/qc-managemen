-- 1. Bảng quản lý năm
CREATE TABLE years (
    id SERIAL PRIMARY KEY,
    year INT UNIQUE NOT NULL
);

-- 2. Bảng phân loại nguyên vật liệu
CREATE TABLE material_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year_id INT REFERENCES years(id)
);

-- 3. Bảng Người dùng & Phân quyền
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role DEFAULT 'USER',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Issue (Dữ liệu chính từ QC Report)
CREATE TYPE issue_status AS ENUM ('NEW', 'PENDING', 'IN_PROGRESS', 'DONE');

CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    issue_code VARCHAR(50) UNIQUE,
    product_type VARCHAR(50), -- Ví dụ: Nguyên vật liệu, repacking...
    product_name VARCHAR(255),
    lot_no VARCHAR(100),
    defect_description TEXT,
    quantity DECIMAL,
    unit VARCHAR(20) DEFAULT 'kg',
    received_date DATE,
    detected_date DATE,
    resolution_direction TEXT,
    status issue_status DEFAULT 'NEW',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    material_category_id INT REFERENCES material_categories(id)
);

-- 5. Bảng thông báo
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    issue_id INT REFERENCES issues(id),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
