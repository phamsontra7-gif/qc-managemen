const { sequelize } = require('./db');

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Add image_url to issues if missing
        try {
            await sequelize.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)');
            console.log('Processed column image_url');
        } catch (e) {
            console.log('Error processing image_url column:', e.message);
        }

        // Add year_id to issues if missing
        try {
            await sequelize.query('ALTER TABLE issues ADD COLUMN IF NOT EXISTS year_id INTEGER REFERENCES years(id)');
            console.log('Processed column year_id');
        } catch (e) {
            console.log('Error processing year_id column:', e.message);
        }

        console.log('Database schema update check finished.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating DB:', err);
        process.exit(1);
    }
}

fix();
