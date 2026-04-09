const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  })
  : new Sequelize(
    process.env.DB_NAME || 'qc_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: false,
    }
  );

// Define Models
const Year = sequelize.define('Year', {
  year: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false
  }
}, { tableName: 'years', timestamps: false });

const MaterialCategory = sequelize.define('MaterialCategory', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, { tableName: 'material_categories', timestamps: false });

const Issue = sequelize.define('Issue', {
  issue_code: { type: DataTypes.STRING, unique: true },
  product_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  product_name: DataTypes.STRING,
  lot_no: DataTypes.STRING,
  defect_description: DataTypes.TEXT,
  quantity: DataTypes.DECIMAL,
  unit: {
    type: DataTypes.STRING,
    defaultValue: 'kg'
    // Should support: kg, bao, pallet
  },
  received_date: DataTypes.DATEONLY,
  detected_date: DataTypes.DATEONLY,
  resolution_direction: DataTypes.TEXT,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'NEW'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
    // Set once on creation, never updated — used for 7-day auto-pending timer
  },
  last_updated: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  year_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  material_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  warehouse_entry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, { tableName: 'issues', timestamps: false });

const Notification = sequelize.define('Notification', {
  message: DataTypes.TEXT,
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'notifications', timestamps: false });

// Tracks every create/update action on an issue (who did it, what changed)
const IssueHistory = sequelize.define('IssueHistory', {
  issue_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true  // null = system action (e.g. cron)
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'System'
  },
  // Action type: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'AUTO_PENDING'
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // JSON string recording what fields changed: { fieldName: { from, to } }
  changes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, { tableName: 'issue_history', timestamps: false });

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'USER'),
    defaultValue: 'USER'
  }
}, { tableName: 'users', timestamps: true });

// Relationships
Year.hasMany(MaterialCategory, { foreignKey: 'year_id' });
MaterialCategory.belongsTo(Year, { foreignKey: 'year_id' });

MaterialCategory.hasMany(Issue, { foreignKey: 'material_category_id' });
Issue.belongsTo(MaterialCategory, { foreignKey: 'material_category_id' });

Year.hasMany(Issue, { foreignKey: 'year_id' });
Issue.belongsTo(Year, { foreignKey: 'year_id' });

Issue.hasMany(Notification, { foreignKey: 'issue_id' });
Notification.belongsTo(Issue, { foreignKey: 'issue_id' });

Issue.hasMany(IssueHistory, { foreignKey: 'issue_id' });
IssueHistory.belongsTo(Issue, { foreignKey: 'issue_id' });

module.exports = {
  sequelize,
  Year,
  MaterialCategory,
  Issue,
  Notification,
  IssueHistory,
  User
};
