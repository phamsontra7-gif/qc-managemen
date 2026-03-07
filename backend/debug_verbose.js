const { sequelize, Issue } = require('./db');

async function debugVerbose() {
    try {
        await sequelize.authenticate();
        const last = await Issue.findOne({ where: { id: 21 } });
        console.log('--- ISSUE 21 VERBOSE ---');
        if (!last) {
            console.log('Not found.');
        } else {
            console.log('ID:', last.id);
            console.log('Code:', JSON.stringify(last.issue_code)); // Check for empty string vs null
            console.log('Type:', JSON.stringify(last.product_type));
            console.log('Date:', JSON.stringify(last.detected_date));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debugVerbose();
