const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    return transporter;
};

/**
 * Send an alert email
 * @param {string} subject
 * @param {string} htmlBody
 */
exports.sendAlertEmail = async (subject, htmlBody) => {
    try {
        const transport = getTransporter();
        await transport.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.ADMIN_EMAIL,
            subject,
            html: htmlBody,
        });
        logger.info(`Email sent: ${subject}`);
    } catch (error) {
        logger.error(`Email send failed: ${error.message}`);
    }
};
