import { createTransport } from 'nodemailer'
import { system } from '../helper/system/system'
import { AppSystemProp } from '@activepieces/server-shared'
import { isNil } from '@activepieces/shared'

const logger = system.globalLogger()

const getTransport = () => {
    const host = system.get(AppSystemProp.SMTP_HOST)
    const port = system.getNumber(AppSystemProp.SMTP_PORT)
    const user = system.get(AppSystemProp.SMTP_USERNAME)
    const pass = system.get(AppSystemProp.SMTP_PASSWORD)

    if (isNil(host)) {
        return null
    }


    return createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass,
        },
    } as any)
}

const transport = getTransport()

export const emailService = {
    async sendInvitation(email: string, link: string) {
        if (!transport) {
            logger.warn(`[EmailService] SMTP not configured, skipping invitation email to ${email}`)
            return
        }

        await transport.sendMail({
            from: system.get(AppSystemProp.SMTP_SENDER_EMAIL) || 'no-reply@activepieces.com',
            to: email,
            subject: 'You have been invited to AIOps',
            html: `<p>You have been invited to join an AIOps project.</p>
                   <p><a href="${link}">Click here to accept the invitation</a></p>`,
        })
    },
    
    async sendVerificationEmail(email: string, link: string) {
        if (!transport) {
            logger.warn(`[EmailService] SMTP not configured, skipping verification email to ${email}`)
            return
        }

        await transport.sendMail({
            from: system.get(AppSystemProp.SMTP_SENDER_EMAIL) || 'no-reply@activepieces.com',
            to: email,
            subject: 'Verify your AIOps account',
            html: `<p>Welcome to AIOps!</p>
                   <p>Please click the link below to verify your account and get started:</p>
                   <p><a href="${link}">Verify Account</a></p>`,
        })
    },

    async sendPasswordResetCode(email: string, link: string) {
        if (!transport) {
            logger.warn(`[EmailService] SMTP not configured, skipping password reset email to ${email}`)
            return
        }

        await transport.sendMail({
            from: system.get(AppSystemProp.SMTP_SENDER_EMAIL) || 'no-reply@activepieces.com',
            to: email,
            subject: 'Reset your AIOps password',
            html: `<p>We received a request to reset your AIOps password.</p>
                   <p>Click the link below to reset it:</p>
                   <p><a href="${link}">Reset Password</a></p>
                   <p>If you didn't request this, please ignore this email.</p>`,
        })
    },

    // Add other methods (welcome, reset password) as needed
}
