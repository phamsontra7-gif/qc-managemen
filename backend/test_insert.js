const { sequelize, Issue } = require('./db');

async function testInsert() {
    try {
        await sequelize.authenticate();

        const data = {
            product_name: "test manually",
            product_type: "Repacking",
            detected_date: "2026-03-07",
            defect_description: "test error",
            quantity: 20,
            unit: "kg",
            lot_no: "010221",
            year_id: 1, // Assume 1 exists for 2026
            status: "NEW"
        };

        // My code gen logic (simplified)
        const aa = 'RP';
        const xxyyzz = '070326';
        const base = `${aa}-${xxyyzz}-`;
        data.issue_code = `${base}XX`; // Just testing insertion

        console.log('Inserting:', data);
        const result = await Issue.create(data);
        console.log('Success!', result.id);

        process.exit(0);
    } catch (err) {
        console.error('INSERT FAILED');
        console.error('Message:', err.message);
        if (err.errors) {
            err.errors.forEach(e => console.log(`- ${e.path}: ${e.message} (${e.type})`));
        }
        process.exit(1);
    }
}
testInsert();
