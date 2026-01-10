
import { AppSystemProp, networkUtils } from '@activepieces/server-shared'
import {
    ALL_PRINCIPAL_TYPES,
    assertNotNullOrUndefined,
    PrincipalType,
    SignInRequest,
    SignUpRequest,
    SwitchPlatformRequest,
    SwitchProjectRequest,
    UserIdentityProvider,
    ResendVerificationEmailRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
} from '@activepieces/shared'
import { RateLimitOptions } from '@fastify/rate-limit'
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { eventsHooks } from '../helper/application-events'
import { system } from '../helper/system/system'
import { platformUtils } from '../platform/platform.utils'
import { userService } from '../user/user-service'
import { authenticationService } from './authentication.service'


import { VerifyEmailRequestBody, CreateOtpRequestBody } from '@activepieces/shared'

// ... existing imports
// ... existing imports

const rateLimitOptions: RateLimitOptions = {
    max: Number.parseInt(
        system.getOrThrow(AppSystemProp.API_RATE_LIMIT_AUTHN_MAX),
        10,
    ),
    timeWindow: system.getOrThrow(AppSystemProp.API_RATE_LIMIT_AUTHN_WINDOW),
}

const CreateOtpRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: CreateOtpRequestBody,
    },
}

const ResendVerificationEmailRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: ResendVerificationEmailRequest,
    },
}

export const authenticationController: FastifyPluginAsyncTypebox = async (
    app,
) => {
    app.post('/otp', CreateOtpRequestOptions, async (request) => {
        return authenticationService(request.log).sendOtp(request.body)
    })

    app.post('/verify-email', VerifyEmailRequestOptions, async (request) => {
        return authenticationService(request.log).verifyEmail(request.body)
    })
    
    app.post('/resend-verification', ResendVerificationEmailRequestOptions, async (request) => {
        return authenticationService(request.log).resendVerificationEmail(request.body.email)
    })

    app.post('/forgot-password', ForgotPasswordRequestOptions, async (request) => {
        return authenticationService(request.log).sendPasswordResetLink(request.body.email)
    })

    app.post('/reset-password', ResetPasswordRequestOptions, async (request) => {
        return authenticationService(request.log).resetPassword(request.body)
    })

    app.post('/sign-up', SignUpRequestOptions, async (request) => {
        request.log.info('[Sign-Up] Request received');
        request.log.info(`[Sign-Up] Request Body PlatformId: ${(request.body as any).platformId}`);
        const resolvedPlatformId = await platformUtils.getPlatformIdForRequest(request)
        request.log.info(`[Sign-Up] Platform ID resolved from utils: ${resolvedPlatformId}`);
        const signUpResponse = await authenticationService(request.log).signUp({
            ...request.body,
            provider: UserIdentityProvider.EMAIL,
            platformId: resolvedPlatformId ?? (request.body as any).platformId ?? null,
        })
        request.log.info('[Sign-Up] Completed successfully');
        return signUpResponse
    })

    app.post('/sign-in', SignInRequestOptions, async (request) => {

        const predefinedPlatformId = await platformUtils.getPlatformIdForRequest(request)
        const response = await authenticationService(request.log).signInWithPassword({
            email: request.body.email,
            password: request.body.password,
            predefinedPlatformId,
        })

        const responsePlatformId = response.platformId
        assertNotNullOrUndefined(responsePlatformId, 'Platform ID is required')


        return response
    })

    app.post('/switch-platform', SwitchPlatformRequestOptions, async (request) => {
        const user = await userService.getOneOrFail({ id: request.principal.id })
        return authenticationService(request.log).switchPlatform({
            identityId: user.identityId,
            platformId: request.body.platformId,
        })
    })

    app.post('/switch-project', SwitchProjectRequestOptions, async (request) => {
        const user = await userService.getOneOrFail({ id: request.principal.id })
        return authenticationService(request.log).switchProject({
            identityId: user.identityId,
            projectId: request.body.projectId,
            currentPlatformId: request.principal.platform.id,
        })
    })
}



const SwitchProjectRequestOptions = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SwitchProjectRequest,
    },
}

const SwitchPlatformRequestOptions = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SwitchPlatformRequest,
    },
}

const SignUpRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SignUpRequest,
    },
}

const SignInRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: SignInRequest,
    },
}

const VerifyEmailRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: VerifyEmailRequestBody,
    },
}

const ForgotPasswordRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: ForgotPasswordRequest,
    },
}

const ResetPasswordRequestOptions = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        rateLimit: rateLimitOptions,
    },
    schema: {
        body: ResetPasswordRequest,
    },
}
