import { Static, Type } from '@sinclair/typebox'
import { EmailType } from '../../user/user'

export const ForgotPasswordRequest = Type.Object({
    email: EmailType,
})

export type ForgotPasswordRequest = Static<typeof ForgotPasswordRequest>
