import { Static, Type } from '@sinclair/typebox'

export const VerifyEmailRequestBody = Type.Object({
    otpcode: Type.String(),
    identityId: Type.String(),
})

export type VerifyEmailRequestBody = Static<typeof VerifyEmailRequestBody>
