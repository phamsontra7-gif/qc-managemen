const { sequelize, Issue } = require('./db');

async function debugLast() {
    try {
        await sequelize.authenticate();
        const last = await Issue.findOne({ order: [['id', 'DESC']] });
        console.log('--- LATEST ISSUE DEBUG ---');
        if (!last) {
            console.log('No issues found.');
        } else {
            console.log('ID:', last.id);
            console.log('Product Name:', last.product_name);
            console.log('Product Type:', last.product_type);
            console.log('Detected Date:', last.detected_date);
            console.log('Issue Code (DB):', last.issue_code);
            console.log('Status:', last.status);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debugLast();
