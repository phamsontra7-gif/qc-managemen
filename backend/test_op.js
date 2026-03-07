const { sequelize, Issue } = require('./db');
const { Op } = require('sequelize');

async function testOp() {
    try {
        await sequelize.authenticate();
        const baseCode = 'RP-070326-';
        const latestIssue = await Issue.findOne({
            where: {
                issue_code: {
                    [Op.like]: `${baseCode}%`
                }
            },
            order: [['issue_code', 'DESC']]
        });
        console.log('Result:', latestIssue ? latestIssue.issue_code : 'NULL');
        process.exit(0);
    } catch (err) {
        console.error('OP TEST FAILED:', err);
        process.exit(1);
    }
}
testOp();
