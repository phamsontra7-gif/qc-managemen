const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const { sequelize, Issue, MaterialCategory, Year, User } = require('./db');
const multer = require('multer');
const path = require('path');
require('./cron'); // Initialize cron jobs

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Upload endpoint
app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

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

// Middleware: Check if Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
};

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
    try {
        // Sanitize incoming body: convert empty strings to null
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string' && req.body[key].trim() === '') {
                req.body[key] = null;
            }
        });

        const { product_type, detected_date, year_id, material_category_id } = req.body;

        // Generate issue_code if not provided or empty
        if (!req.body.issue_code) {
            try {
                // Map product_type to aa (Fixed per user request)
                const pt = product_type || '';
                let aa = 'K';
                if (pt.toLowerCase().includes('thành phẩm') || pt.toLowerCase().includes('products')) aa = 'TP';
                else if (pt.toLowerCase().includes('nguyên vật liệu') || pt.toLowerCase().includes('raw')) aa = 'NL';
                else if (pt.toLowerCase().includes('repacking')) aa = 'RP';
                else aa = 'K';

                // Extract DDMMYY safely from YYYY-MM-DD string
                let xxyyzz = '';
                if (detected_date && detected_date.includes('-')) {
                    const parts = detected_date.split('-'); // [YYYY, MM, DD]
                    if (parts.length === 3) {
                        const y = parts[0].slice(-2);
                        const m = parts[1].padStart(2, '0');
                        const d = parts[2].padStart(2, '0');
                        xxyyzz = `${d}${m}${y}`;
                    }
                }

                if (!xxyyzz) {
                    const now = new Date();
                    const d = String(now.getDate()).padStart(2, '0');
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const y = String(now.getFullYear()).slice(-2);
                    xxyyzz = `${d}${m}${y}`;
                }

                const baseCode = `${aa}-${xxyyzz}-`;

                // Find highest existing TT for this prefix and day
                const latestIssue = await Issue.findOne({
                    where: {
                        issue_code: {
                            [Op.like]: `${baseCode}%`
                        }
                    },
                    order: [['issue_code', 'DESC']]
                });

                let nextNumber = 1;
                if (latestIssue && latestIssue.issue_code) {
                    const codeParts = latestIssue.issue_code.split('-');
                    const lastValue = codeParts[codeParts.length - 1];
                    const lastTT = parseInt(lastValue);
                    if (!isNaN(lastTT)) {
                        nextNumber = lastTT + 1;
                    }
                }

                const ttValue = String(nextNumber).padStart(2, '0');
                req.body.issue_code = `${baseCode}${ttValue}`;
            } catch (genError) {
                console.error('ERROR IN CODE GEN:', genError);
                req.body.issue_code = null;
            }
        }

        const issue = await Issue.create(req.body);
        res.status(201).json(issue);
    } catch (error) {
        console.error('CRITICAL SERVER ERROR:', error);

        let details = error.message;
        if (error.errors) {
            details = error.errors.map(e => `${e.path || 'unknown'}: ${e.message}`).join(' | ');
        }

        res.status(400).json({
            error: `Lỗi chi tiết từ DB: ${details}`,
            fullError: error.name
        });
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

app.listen(PORT, '0.0.0.0', async () => {
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
