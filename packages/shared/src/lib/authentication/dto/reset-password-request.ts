import { Static, Type } from '@sinclair/typebox'
import { PasswordType } from '../../user/user'

export const ResetPasswordRequest = Type.Object({
    token: Type.String(),
    password: PasswordType,
})

export type ResetPasswordRequest = Static<typeof ResetPasswordRequest>
