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
require('./cron'); // Initialize cron jobs

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

// --- DATA ROUTES (Protected) ---
app.get('/api/years', authenticate, async (req, res) => {
    try {
        const years = await Year.findAll({
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
