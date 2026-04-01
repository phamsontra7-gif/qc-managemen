const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const { sequelize, Issue, MaterialCategory, Year, User } = require('./db');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cloudinary = require('cloudinary').v2;
const XLSX = require('xlsx');
const initCron = require('./cron'); // Cron factory — initialized after io is created

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust matching your frontend's origin
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Middleware to inject `io` into `req`
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
    console.log(`🔌 Client connected via socket: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Initialize cron jobs (pass io so cron can emit socket events)
const cronJobs = initCron(io);

// Configure Multer - use memory storage, upload to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, mimetype) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'qc-management', resource_type: 'image' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware: Authenticate JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// Middleware: Check if Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
};

// Upload endpoint - Cloudinary
app.post('/api/upload', authenticate, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
        res.json({ imageUrl: result.secure_url });
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ error: 'Failed to upload image to cloud' });
    }
});



// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashedPassword, full_name, role });
        res.status(201).json({ message: 'User registered successfully', user: { id: user.id, username: user.username } });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.full_name },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.full_name } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
    res.json(req.user);
});



// --- USER MANAGEMENT ROUTES ---
app.get('/api/users', authenticate, isAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', authenticate, isAdmin, async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashedPassword, full_name, role });
        res.status(201).json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await User.destroy({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, password } = req.body;
        const updateData = { full_name, role };
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }
        await User.update(updateData, { where: { id } });
        const updated = await User.findOne({ where: { id }, attributes: { exclude: ['password'] } });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- DATA ROUTES (Protected) ---
app.get('/api/years', authenticate, async (req, res) => {
    try {
        const years = await Year.findAll({
            where: {
                year: { [Op.notIn]: [2023, 2024] }
            },
            order: [['year', 'ASC']]
        });
        res.json(years);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories', authenticate, async (req, res) => {
    try {
        const categories = await MaterialCategory.findAll({ include: [Year] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/issues', authenticate, async (req, res) => {
    try {
        const { year_id, category_id } = req.query;
        let whereClause = {};

        if (category_id) {
            whereClause.material_category_id = category_id;
        } else if (year_id) {
            whereClause.year_id = year_id;
        }

        const issues = await Issue.findAll({
            where: whereClause,
            include: [
                { model: MaterialCategory, include: [Year] },
                { model: Year }
            ],
            order: [['last_updated', 'DESC']]
        });
        res.json(issues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/issues', authenticate, async (req, res) => {
    console.log('--- [ISSUES POST] Received request ---');
    try {
        // 1. Sanitize the body: trim all strings and convert empty to null
        const bodyContent = { ...req.body };
        Object.keys(bodyContent).forEach(key => {
            if (typeof bodyContent[key] === 'string') {
                bodyContent[key] = bodyContent[key].trim();
                if (bodyContent[key] === '') bodyContent[key] = null;
            }
        });

        const { product_type, detected_date } = bodyContent;
        console.log('Request Data:', JSON.stringify({ product_type, detected_date, issue_code: bodyContent.issue_code }));

        // 2. Automated issue_code generation (e.g., aa-xxyyzz-tt)
        if (!bodyContent.issue_code) {
            try {
                // A. Determine prefix (aa)
                let aa = 'K';
                const pt = (product_type || '').toLowerCase();
                if (pt.includes('thành phẩm') || pt.includes('products')) aa = 'TP';
                else if (pt.includes('nguyên vật liệu') || pt.includes('raw')) aa = 'NL';
                else if (pt.includes('repacking')) aa = 'RP';

                // B. Determine date components from detected_date (YYYY-MM-DD)
                let dd = '', mm = '', yy = '';
                if (detected_date && detected_date.includes('-')) {
                    const [y4, month, day] = detected_date.split('-');
                    dd = day;
                    mm = month;
                    yy = y4.slice(-2);
                } else {
                    const today = new Date();
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0');
                    yy = String(today.getFullYear()).slice(-2);
                }

                const dateCode = `${dd}${mm}${yy}`;
                const basePattern = `${aa}-${dateCode}-`;
                const monthYearSearchPattern = `${aa}-%%${mm}${yy}-%`;

                // C. Determine sequence (tt) based on MONTHLY count
                const matchingIssues = await Issue.findAll({
                    where: {
                        issue_code: { [Op.like]: monthYearSearchPattern }
                    },
                    attributes: ['issue_code']
                });

                let highestTT = 0;
                matchingIssues.forEach(m => {
                    if (m.issue_code) {
                        const parts = m.issue_code.split('-');
                        const lastPart = parts[parts.length - 1];
                        const lastNum = parseInt(lastPart);
                        if (!isNaN(lastNum) && lastNum > highestTT) {
                            highestTT = lastNum;
                        }
                    }
                });

                let nextNumber = highestTT + 1;
                const ttValue = String(nextNumber).padStart(2, '0');
                bodyContent.issue_code = `${basePattern}${ttValue}`;
                console.log('Generated monthly code:', bodyContent.issue_code);
            } catch (genErr) {
                console.error('Monthly Code gen error:', genErr.message);
                bodyContent.issue_code = null;
            }
        }

        const issue = await Issue.create(bodyContent);

        // Fetch it back with relations to emit full data
        const newIssue = await Issue.findOne({
            where: { id: issue.id },
            include: [
                { model: MaterialCategory, include: [Year] },
                { model: Year }
            ]
        });

        // Emit socket event
        req.io.emit('issue_created', newIssue);

        console.log('Success! Saved with ID:', issue.id);
        res.status(201).json(newIssue);
    } catch (error) {
        console.error('--- [ISSUES POST ERROR] ---');
        console.error(error);

        let details = error.message;
        if (error.errors && Array.isArray(error.errors)) {
            details = error.errors.map(e => `${e.path || 'unknown'}: ${e.message}`).join(' | ');
        }

        res.status(400).json({
            error: `Lỗi chi tiết từ DB: ${details || 'Lỗi không xác định'}`,
            fullError: error.name,
            originalError: error.message
        });
    }
});

app.put('/api/issues/:id', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findByPk(id);

        if (!issue) {
            return res.status(404).json({ error: 'Sự cố không tồn tại' });
        }

        const bodyContent = { ...req.body };
        Object.keys(bodyContent).forEach(key => {
            if (typeof bodyContent[key] === 'string') {
                bodyContent[key] = bodyContent[key].trim();
                if (bodyContent[key] === '') bodyContent[key] = null;
            }
        });

        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
                bodyContent.image_url = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error in PUT:', uploadError);
                return res.status(500).json({ error: 'Failed to upload image' });
            }
        }

        await issue.update(bodyContent);

        const updatedIssue = await Issue.findOne({
            where: { id },
            include: [
                { model: MaterialCategory, include: [Year] },
                { model: Year }
            ]
        });

        // Emit socket event
        req.io.emit('issue_updated', updatedIssue);

        res.json(updatedIssue);
    } catch (error) {
        console.error('--- [ISSUES PUT ERROR] ---', error);
        res.status(500).json({ error: error.message || 'Lỗi hệ thống khi cập nhật' });
    }
});

app.delete('/api/issues/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findByPk(id);

        if (!issue) {
            return res.status(404).json({ error: 'Sự cố không tồn tại' });
        }

        // Delete the issue from the database
        await issue.destroy();

        // Emit socket event so clients can remove it from their lists
        req.io.emit('issue_deleted', { id: parseInt(id) });

        res.json({ message: 'Đã xóa sự cố thành công', id: parseInt(id) });
    } catch (error) {
        console.error('--- [ISSUES DELETE ERROR] ---', error);
        res.status(500).json({ error: 'Lỗi hệ thống khi xóa' });
    }
});

// --- TEST ROUTE: manually trigger cron job (remove in production) ---
app.get('/api/test/run-cron', async (req, res) => {
    try {
        console.log('🔧 Manual cron trigger via /api/test/run-cron');
        await cronJobs.checkOverdueIssues();
        res.json({ message: 'Cron job executed successfully. Check server logs for details.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Seed data route for testing
app.post('/api/seed', async (req, res) => {
    try {
        await sequelize.sync({ force: true });

        // Create Years 2023-2030
        const yearsData = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
        const createdYears = {};
        for (const y of yearsData) {
            createdYears[y] = await Year.create({ year: y });
        }

        const cat1 = await MaterialCategory.create({ name: 'Thành phẩm', year_id: createdYears[2025].id });
        const cat2 = await MaterialCategory.create({ name: 'Nguyên liệu', year_id: createdYears[2025].id });

        // Create Admin User
        const adminPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            username: 'admin',
            password: adminPassword,
            full_name: 'Hệ thống Quản trị',
            role: 'ADMIN'
        });

        const sampleIssues = [
            {
                product_name: "Wonder cat",
                product_type: "Thành phẩm/Products",
                defect_description: "Phát hiện bọ trong bao",
                quantity: 3270,
                unit: 'kg',
                received_date: "2025-07-19",
                detected_date: "2025-07-19",
                resolution_direction: "Sàng 100% loại bỏ côn trùng => Repacking",
                status: "DONE",
                year_id: createdYears[2025].id,
                material_category_id: cat1.id
            },
            {
                product_name: "Wheat flour (Bột mì)",
                product_type: "Nguyên Vật Liệu/Raw Material",
                defect_description: "Phát hiện nấm mốc và côn trùng sống",
                quantity: 25,
                unit: 'bao',
                received_date: "2025-10-20",
                detected_date: "2025-12-05",
                resolution_direction: "Cách ly và xử lý khẩn cấp",
                status: "PENDING",
                year_id: createdYears[2025].id,
                material_category_id: cat2.id
            }
        ];

        await Issue.bulkCreate(sampleIssues);
        res.json({ message: 'Database seeded with years 2023-2030 successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STATS: Year-over-Year Comparison ---
app.get('/api/stats/yearly-comparison', authenticate, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;

        // Find Year records for both years
        const [curYearObj, prevYearObj] = await Promise.all([
            Year.findOne({ where: { year: currentYear } }),
            Year.findOne({ where: { year: previousYear } })
        ]);

        const currentYearId = curYearObj ? curYearObj.id : null;
        const previousYearId = prevYearObj ? prevYearObj.id : null;

        // Fetch issues for both years via detected_date year OR year_id
        const fetchByYear = async (yearId, yearNum) => {
            if (!yearId) return [];
            return Issue.findAll({
                where: { year_id: yearId },
                attributes: ['product_type', 'status']
            });
        };

        const [currentIssues, previousIssues] = await Promise.all([
            fetchByYear(currentYearId, currentYear),
            fetchByYear(previousYearId, previousYear)
        ]);

        // Collect all unique product_types across both years
        const allTypes = new Set([
            ...currentIssues.map(i => i.product_type || 'Khác/Other'),
            ...previousIssues.map(i => i.product_type || 'Khác/Other')
        ]);

        const groups = Array.from(allTypes).sort().map(pt => {
            const curr = currentIssues.filter(i => (i.product_type || 'Khác/Other') === pt);
            const prev = previousIssues.filter(i => (i.product_type || 'Khác/Other') === pt);
            return {
                product_type: pt,
                current: {
                    total: curr.length,
                    new: curr.filter(i => i.status === 'NEW').length,
                    pending: curr.filter(i => i.status === 'PENDING').length,
                    done: curr.filter(i => i.status === 'DONE').length,
                },
                previous: {
                    total: prev.length,
                    new: prev.filter(i => i.status === 'NEW').length,
                    pending: prev.filter(i => i.status === 'PENDING').length,
                    done: prev.filter(i => i.status === 'DONE').length,
                }
            };
        });

        res.json({ currentYear, previousYear, groups });
    } catch (error) {
        console.error('yearly-comparison error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── EXCEL IMPORT ENDPOINT ─────────────────────────────────────────────────
// POST /api/import/excel
// Body (multipart): file = .xlsx file, product_type = 'Ingredient'|'Product'|'Repacking'
// The filename should be like "2025.07.xlsx" so we can extract year/month.
// Each sheet name is the detection day (e.g. "01.12" or "01").
app.post('/api/import/excel', authenticate, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Không có file được tải lên' });
    }

    const results = { success: 0, skipped: 0, errors: [] };

    try {
        // --- 1. Xác định product_type từ tham số truyền lên ---
        const rawFolder = (req.body.product_type || '').trim();
        let product_type = 'Khác/Other';
        const folderLower = rawFolder.toLowerCase();
        if (folderLower.includes('ingredient') || folderLower.includes('nguyên')) {
            product_type = 'Nguyên Vật Liệu/Raw Material';
        } else if (folderLower.includes('product') || folderLower.includes('thành phẩm')) {
            product_type = 'Thành phẩm/Products';
        } else if (folderLower.includes('repacking')) {
            product_type = 'Repacking';
        }

        // --- 2. Xác định năm/tháng từ tên file (vd: "2025.07.xlsx") ---
        const originalName = req.file.originalname.replace(/\.xlsx?$/i, ''); // "2025.07"
        const fileParts = originalName.split('.');
        let fileYear = null;
        let fileMonth = null;
        if (fileParts.length >= 2) {
            fileYear = parseInt(fileParts[0]);   // 2025
            fileMonth = parseInt(fileParts[1]);   // 7
        } else if (fileParts.length === 1) {
            fileYear = parseInt(fileParts[0]);
        }

        // --- 3. Tìm hoặc tạo Year record ---
        let yearRecord = null;
        if (fileYear && !isNaN(fileYear)) {
            [yearRecord] = await Year.findOrCreate({ where: { year: fileYear } });
        }

        // --- 4. Parse Excel ---
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });

        for (const sheetName of workbook.SheetNames) {
            // --- 5. Parse ngày từ tên sheet ---
            // Tên sheet có thể là: "01.12", "01/12", "1", "01", "01.12.2025", v.v.
            let detectedDay = null;
            let detectedMonth = fileMonth;
            let detectedYear = fileYear;

            const sheetTrimmed = sheetName.trim();
            // Try formats: "DD.MM", "DD/MM", "DD.MM.YYYY", "DD/MM/YYYY", just "D" or "DD"
            const dotMatch = sheetTrimmed.match(/^(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?$/);
            if (dotMatch) {
                detectedDay = parseInt(dotMatch[1]);
                detectedMonth = parseInt(dotMatch[2]);
                if (dotMatch[3]) {
                    const y = parseInt(dotMatch[3]);
                    detectedYear = y < 100 ? 2000 + y : y;
                }
            } else {
                const numMatch = sheetTrimmed.match(/^(\d{1,2})$/);
                if (numMatch) {
                    detectedDay = parseInt(numMatch[1]);
                }
            }

            if (!detectedDay || isNaN(detectedDay)) {
                // Không thể parse ngày từ tên sheet, bỏ qua
                results.errors.push(`Sheet "${sheetName}": Không parse được ngày từ tên sheet`);
                continue;
            }

            const detected_date = detectedYear && detectedMonth
                ? `${detectedYear}-${String(detectedMonth).padStart(2, '0')}-${String(detectedDay).padStart(2, '0')}`
                : null;

            // --- 6. Đọc rows từ sheet ---
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            // Tìm hàng header: tìm hàng đầu tiên có từ "LOT" hoặc "PRODUCT" hoặc "SỐ LÔ"
            let dataStartRow = 2; // Mặc định bỏ 2 hàng đầu (header)
            for (let ri = 0; ri < Math.min(5, rows.length); ri++) {
                const rowStr = rows[ri].join(' ').toUpperCase();
                if (rowStr.includes('LOT') || rowStr.includes('PRODUCT') || rowStr.includes('SỐ LÔ') || rowStr.includes('NAME')) {
                    dataStartRow = ri + 1; // Dữ liệu bắt đầu từ hàng tiếp theo
                    break;
                }
            }

            for (let ri = dataStartRow; ri < rows.length; ri++) {
                const row = rows[ri];
                // Bỏ qua hàng trống
                const rowText = row.join('').trim();
                if (!rowText) continue;

                // Map cột theo thứ tự:
                // A(0)=MFD/SỐ LÔ, B(1)=LOT NO, C(2)=STOCK IN DATE, D(3)=DATE OF DETECTION,
                // E(4)=PRODUCT NAME, F(5)=REASONS, G(6)=QUANTITY, H(7)=REMEDIES, I(8)=IMAGE
                const mfd_code    = String(row[0] || '').trim();
                const lot_no      = String(row[1] || '').trim();
                const stock_raw   = row[2];
                const detect_raw  = row[3];
                const product_name = String(row[4] || '').trim();
                const defect_description = String(row[5] || '').trim();
                const qty_raw     = row[6];
                const resolution_direction = String(row[7] || '').trim();

                if (!product_name && !lot_no) continue; // Bỏ hàng không có dữ liệu

                // Parse dates
                const parseExcelDate = (val) => {
                    if (!val) return null;
                    if (val instanceof Date) {
                        const d = String(val.getDate()).padStart(2, '0');
                        const m = String(val.getMonth() + 1).padStart(2, '0');
                        const y = val.getFullYear();
                        return `${y}-${m}-${d}`;
                    }
                    const s = String(val).trim();
                    // Format DD/MM/YYYY or DD.MM.YYYY
                    const dm = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
                    if (dm) {
                        const y = parseInt(dm[3]) < 100 ? 2000 + parseInt(dm[3]) : parseInt(dm[3]);
                        return `${y}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
                    }
                    // Try numeric (Excel serial)
                    const num = parseFloat(s);
                    if (!isNaN(num) && num > 40000) {
                        const d = XLSX.SSF.parse_date_code(num);
                        if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
                    }
                    return null;
                };

                const received_date = parseExcelDate(stock_raw);
                const final_detected_date = parseExcelDate(detect_raw) || detected_date;

                // Parse quantity
                let quantity = null;
                const qStr = String(qty_raw || '').replace(/[^\d.]/g, '');
                if (qStr) quantity = parseFloat(qStr);

                // Determine year_id from detected_date
                let finalYearRecord = yearRecord;
                if (final_detected_date) {
                    const yr = parseInt(final_detected_date.split('-')[0]);
                    if (!finalYearRecord || finalYearRecord.year !== yr) {
                        [finalYearRecord] = await Year.findOrCreate({ where: { year: yr } });
                    }
                }

                // Build issue data
                const issueData = {
                    product_name: product_name || null,
                    product_type,
                    lot_no: lot_no || mfd_code || null,
                    defect_description: defect_description || null,
                    quantity: quantity,
                    unit: 'kg',
                    received_date: received_date || null,
                    detected_date: final_detected_date || null,
                    resolution_direction: resolution_direction || null,
                    status: 'NEW',
                    year_id: finalYearRecord ? finalYearRecord.id : null,
                    last_updated: new Date()
                };

                // --- 7. Tự sinh issue_code (giống logic trong POST /api/issues) ---
                try {
                    let aa = 'K';
                    const pt = (product_type || '').toLowerCase();
                    if (pt.includes('thành phẩm') || pt.includes('products')) aa = 'TP';
                    else if (pt.includes('nguyên') || pt.includes('raw')) aa = 'NL';
                    else if (pt.includes('repacking')) aa = 'RP';

                    let dd2 = '', mm2 = '', yy2 = '';
                    if (final_detected_date) {
                        const [y4, mo, dy] = final_detected_date.split('-');
                        dd2 = dy; mm2 = mo; yy2 = y4.slice(-2);
                    } else {
                        const today = new Date();
                        dd2 = String(today.getDate()).padStart(2, '0');
                        mm2 = String(today.getMonth() + 1).padStart(2, '0');
                        yy2 = String(today.getFullYear()).slice(-2);
                    }

                    const dateCode = `${dd2}${mm2}${yy2}`;
                    const monthYearSearch = `${aa}-%%${mm2}${yy2}-%`;
                    const matching = await Issue.findAll({
                        where: { issue_code: { [Op.like]: monthYearSearch } },
                        attributes: ['issue_code']
                    });
                    let highest = 0;
                    matching.forEach(m => {
                        if (m.issue_code) {
                            const parts = m.issue_code.split('-');
                            const n = parseInt(parts[parts.length - 1]);
                            if (!isNaN(n) && n > highest) highest = n;
                        }
                    });
                    issueData.issue_code = `${aa}-${dateCode}-${String(highest + 1).padStart(2, '0')}`;
                } catch (codeErr) {
                    console.error('Issue code gen error:', codeErr.message);
                    issueData.issue_code = null;
                }

                // --- 8. Tạo Issue (kiểm tra duplicate theo lot_no + detected_date) ---
                try {
                    if (lot_no && final_detected_date) {
                        const existing = await Issue.findOne({
                            where: { lot_no, detected_date: final_detected_date }
                        });
                        if (existing) {
                            results.skipped++;
                            continue;
                        }
                    }

                    const newIssue = await Issue.create(issueData);
                    req.io.emit('issue_created', newIssue);
                    results.success++;
                } catch (createErr) {
                    results.errors.push(`Sheet "${sheetName}" Row ${ri + 1}: ${createErr.message}`);
                }
            }
        }

        res.json({
            message: `Import hoàn tất: ${results.success} tạo mới, ${results.skipped} bỏ qua (trùng), ${results.errors.length} lỗi`,
            ...results
        });
    } catch (err) {
        console.error('[IMPORT EXCEL ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server is running on port ${PORT}`);

    try {
        console.log('⏳ Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        // Sync in background and seed if needed
        sequelize.sync({ alter: true }).then(async () => {
            console.log('✅ Database models synced.');

            try {
                const adminUser = await User.findOne({ where: { username: 'admin' } });
                if (!adminUser) {
                    console.log('No Admin found, creating default admin account...');
                    const adminPassword = await bcrypt.hash('admin123', 10);
                    await User.create({
                        username: 'admin',
                        password: adminPassword,
                        full_name: 'Hệ thống Quản trị',
                        role: 'ADMIN'
                    });
                }

                // Seed years if not present
                const targetYears = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
                for (const yearVal of targetYears) {
                    const [yearObj, created] = await Year.findOrCreate({ where: { year: yearVal } });
                    if (created) console.log(`Created year: ${yearVal}`);
                }
                console.log('✅ Background seeding completed.');
            } catch (seedError) {
                console.error('❌ Background seeding failed:', seedError.message);
            }
        });
    } catch (err) {
        console.error('❌ Database connection error:', err);
    }
});
