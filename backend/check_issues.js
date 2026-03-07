const { sequelize, Issue } = require('./db');

async function check() {
    try {
        await sequelize.authenticate();
        const issues = await Issue.findAll({
            attributes: ['id', 'issue_code', 'product_name'],
            limit: 20,
            order: [['id', 'DESC']]
        });
        console.log('Last 20 issues:');
        issues.forEach(i => console.log(`${i.id}: [${i.issue_code}] - ${i.product_name}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
