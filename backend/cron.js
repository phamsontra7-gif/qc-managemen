const cron = require('node-cron');
const { Issue, Notification, MaterialCategory, Year, IssueHistory } = require('./db');
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

// Main cron task: auto-set status NEW → PENDING after 7 days since detected_date
const checkOverdueIssues = async (io) => {
    console.log('⏰ Running daily task: Checking for overdue NEW issues...');

    // Format as YYYY-MM-DD string to correctly compare with DATEONLY column
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]; // e.g. "2026-03-18"
    console.log(`Checking for NEW issues with detected_date <= ${sevenDaysAgoStr}`);

    try {
        // Find issues that are still NEW and detected_date is more than 7 days ago
        const overdueIssues = await Issue.findAll({
            where: {
                status: 'NEW',
                detected_date: { [Op.lte]: sevenDaysAgoStr }
            }
        });

        console.log(`Found ${overdueIssues.length} NEW issue(s) overdue (> 7 days without update).`);

        for (const issue of overdueIssues) {
            // Auto-change status to PENDING
            await issue.update({
                status: 'PENDING',
                last_updated: new Date()
            });

            // Create notification record
            const message = `⚠️ Issue "${issue.product_name || issue.issue_code}" has been automatically moved to PENDING — no update in 7 days.`;
            await createNotification(issue.id, message);
            console.log(`✅ Issue ID ${issue.id} auto-changed: NEW → PENDING`);

            // Record AUTO_PENDING history
            try {
                await IssueHistory.create({
                    issue_id: issue.id,
                    user_id: null,
                    user_name: 'System',
                    action: 'AUTO_PENDING',
                    changes: JSON.stringify({ status: { from: 'NEW', to: 'PENDING' } })
                });
            } catch (histErr) {
                console.error('Failed to write AUTO_PENDING history:', histErr.message);
            }

            // Emit socket event to update frontend in realtime (if io is available)
            if (io) {
                const updatedIssue = await Issue.findOne({
                    where: { id: issue.id },
                    include: [
                        { model: MaterialCategory, include: [Year] },
                        { model: Year }
                    ]
                });
                io.emit('issue_updated', updatedIssue);
            }

            // Send push notification
            sendPushNotification(issue.id);
        }

        console.log(`✅ Daily cron task completed. Auto-changed ${overdueIssues.length} issue(s) to PENDING.`);
    } catch (error) {
        console.error('❌ Error in checkOverdueIssues cron job:', error);
    }
};

// Export a factory function that accepts io and registers the cron job
module.exports = (io) => {
    // Schedule task to run every hour at minute 0
    cron.schedule('0 * * * *', () => checkOverdueIssues(io), {
        timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('🕐 Cron job scheduled: Auto-pending overdue issues every hour.');

    // Export the function so it can be triggered manually (e.g. for testing)
    return { checkOverdueIssues: () => checkOverdueIssues(io) };
};
