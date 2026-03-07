const { sequelize, Issue } = require('./db');
const { Op } = require('sequelize');

async function simulate() {
    try {
        await sequelize.authenticate();

        // Simulate req.body from screenshot
        // Loai SP: Repacking
        // Ngay phat hien: 2026-03-07
        const body = {
            product_type: "Repacking",
            detected_date: "2026-03-07",
            issue_code: "" // User left it blank
        };

        // Sanitize
        Object.keys(body).forEach(key => {
            if (typeof body[key] === 'string' && body[key].trim() === '') {
                body[key] = null;
            }
        });

        const { product_type, detected_date } = body;
        console.log('Post-sanitize:', body);

        if (!body.issue_code) {
            const pt = product_type || '';
            let aa = 'K';
            if (pt.toLowerCase().includes('thành phẩm') || pt.toLowerCase().includes('products')) aa = 'TP';
            else if (pt.toLowerCase().includes('nguyên vật liệu') || pt.toLowerCase().includes('raw')) aa = 'NL';
            else if (pt.toLowerCase().includes('repacking')) aa = 'RP';
            else aa = 'K';
            console.log('Prefix (aa):', aa);

            let xxyyzz = '';
            if (detected_date && detected_date.includes('-')) {
                const parts = detected_date.split('-');
                const y = parts[0].slice(-2);
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                xxyyzz = `${d}${m}${y}`;
            }
            console.log('Date Code (xxyyzz):', xxyyzz);

            const baseCode = `${aa}-${xxyyzz}-`;
            console.log('Querying for:', `${baseCode}%`);

            const latestIssue = await Issue.findOne({
                where: { issue_code: { [Op.like]: `${baseCode}%` } },
                order: [['issue_code', 'DESC']]
            });
            console.log('Found latest:', latestIssue ? latestIssue.issue_code : 'NULL');

            let nextNumber = 1;
            if (latestIssue && latestIssue.issue_code) {
                const codeParts = latestIssue.issue_code.split('-');
                const lastTT = parseInt(codeParts[codeParts.length - 1]);
                if (!isNaN(lastTT)) nextNumber = lastTT + 1;
            }

            const ttValue = String(nextNumber).padStart(2, '0');
            body.issue_code = `${baseCode}${ttValue}`;
            console.log('Generated:', body.issue_code);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
simulate();
