const { sequelize, Issue } = require('./db');

async function clean() {
    try {
        await sequelize.authenticate();
        // Convert empty string issue_codes to NULL or delete them if they are duplicates
        // Actually, just set them to NULL if they are empty
        await sequelize.query("UPDATE issues SET issue_code = NULL WHERE issue_code = ''");
        console.log('Cleaned up empty issue_codes.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
clean();
