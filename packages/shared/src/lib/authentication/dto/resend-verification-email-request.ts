import { Static, Type } from '@sinclair/typebox'
import { EmailType } from '../../user/user'

export const ResendVerificationEmailRequest = Type.Object({
    email: EmailType,
})

export type ResendVerificationEmailRequest = Static<typeof ResendVerificationEmailRequest>
