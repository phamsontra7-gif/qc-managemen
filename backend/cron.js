const cron = require('node-cron');
const { Issue, Notification, sequelize } = require('./db');
const { Op } = require('sequelize');

// Mock function for Push Notification (e.g. FCM)
const sendPushNotification = (issueId) => {
    console.log(`Sending FCM push notification for Issue ID: ${issueId}`);
};

const createNotification = async (issueId, message) => {
    try {
        await Notification.create({
            issue_id: issueId,
            message: message
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

const checkOverdueIssues = async () => {
    console.log('Running daily task: Checking for overdue issues...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
        // Tìm các issue chưa xong và không cập nhật trong 7 ngày
        const overdueIssues = await Issue.findAll({
            where: {
                status: { [Op.ne]: 'DONE' },
                last_updated: { [Op.lte]: sevenDaysAgo }
            }
        });

        for (const issue of overdueIssues) {
            // Tạo thông báo vào bảng Notifications
            await createNotification(
                issue.id,
                `Cảnh báo: Issue ${issue.product_name} đã quá 7 ngày chưa có cập nhật mới!`
            );
            // Gửi qua FCM cho Manager/Admin
            sendPushNotification(issue.id);
        }
        console.log(`Task completed. Found ${overdueIssues.length} overdue issues.`);
    } catch (error) {
        console.error('Error checking overdue issues:', error);
    }
};

// Schedule task to run at 00:00 every day
cron.schedule('0 0 * * *', checkOverdueIssues);

module.exports = { checkOverdueIssues };
