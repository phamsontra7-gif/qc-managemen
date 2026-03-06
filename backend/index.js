const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, Issue, MaterialCategory, Year, User } = require('./db');
require('./cron'); // Initialize cron jobs

const app = express();
app.use(cors());
app.use(express.json());

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
            include: [{ model: MaterialCategory }],
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
        const issue = await Issue.create(req.body);
        res.status(201).json(issue);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Seed data route for testing
app.post('/api/seed', async (req, res) => {
    try {
        await sequelize.sync({ force: true });

        const year2025 = await Year.create({ year: 2025 });

        const cat1 = await MaterialCategory.create({ name: 'Thành phẩm', year_id: year2025.id });
        const cat2 = await MaterialCategory.create({ name: 'Nguyên liệu', year_id: year2025.id });

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
                defect_description: "Phát hiện bọ trong bao",
                quantity: 3270,
                received_date: "2025-07-19",
                resolution_direction: "Sàng 100% loại bỏ côn trùng => Repacking",
                status: "DONE",
                material_category_id: cat1.id
            },
            {
                product_name: "Wheat flour (Bột mì)",
                defect_description: "Phát hiện nấm mốc và côn trùng sống",
                quantity: null,
                received_date: "2025-10-20",
                detected_date: "2025-12-05",
                resolution_direction: "Cách ly và xử lý khẩn cấp",
                status: "PENDING",
                material_category_id: cat2.id
            }
        ];

        await Issue.bulkCreate(sampleIssues);
        res.json({ message: 'Database seeded successfully!' });
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
        });
    } catch (err) {
        console.error('❌ Database connection error:', err);
    }
});
