const nodemailer = require('nodemailer');

const smtpConfig = {
    host: 'smtp.zoho.in',
    port: 587,
    secure: false, // true for 465, false for others
    auth: {
        user: 'hello@aiops.monster',
        pass: 'DqrKa4EM8Z4J'
    },
    tls: {
        rejectUnauthorized: false
    }
};

const transporter = nodemailer.createTransport(smtpConfig);

async function verifySmtp() {
    console.log("-----------------------------------------");
    console.log("Testing SMTP Connection...");
    console.log(`Host: ${smtpConfig.host}`);
    console.log(`User: ${smtpConfig.auth.user}`);
    console.log("-----------------------------------------");

    try {
        // 1. Verify Connection Configuration
        await transporter.verify();
        console.log("✅ SMTP Connection Successful! Server is ready to take messages.");

        // 2. Send Test Email
        const info = await transporter.sendMail({
            from: '"AIOps Test" <hello@aiops.monster>',
            to: 'hello@aiops.monster', // Sending to self for verification
            subject: 'SMTP Test - AIOps Platform',
            text: 'If you receive this, the SMTP credentials and configuration are working correctly.',
            html: '<b>If you receive this, the SMTP credentials and configuration are working correctly.</b>'
        });

        console.log("✅ Test Email Sent!");
        console.log(`Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("❌ SMTP Test FAILED");
        console.error(error);
    }
}

verifySmtp();
