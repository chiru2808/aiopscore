
import { cryptoUtils, AppSystemProp, WorkerSystemProp } from '@activepieces/server-shared'
import { ActivepiecesError, ApEdition, ApFlagId, assertNotNullOrUndefined, AuthenticationResponse, ErrorCode, isNil, PlatformRole, PlatformWithoutSensitiveData, ProjectType, User, UserIdentity, UserIdentityProvider, apId, VerifyEmailRequestBody, CreateOtpRequestBody, ResetPasswordRequest, InvitationType, ProjectMemberRole } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { EntityManager } from 'typeorm'
import { transaction } from '../core/db/transaction'

import { flagService } from '../flags/flag.service'
import { system } from '../helper/system/system'
import { platformService } from '../platform/platform.service'
import { platformUtils } from '../platform/platform.utils'
import { projectService } from '../project/project-service'
import { userService, userRepo } from '../user/user-service'
import { userInvitationsService } from '../user-invitations/user-invitation.service'
import { projectMemberService } from '../project/project-member.service'
import { authenticationUtils } from './authentication-utils'
import { userIdentityService } from './user-identity/user-identity-service'
import { jwtUtils } from '../helper/jwt-utils'
import { emailService } from '../email/email.service'



export const authenticationService = (log: FastifyBaseLogger) => ({
    async signUp(params: SignUpParams): Promise<AuthenticationResponse> {
        return transaction(async (entityManager) => {
            if (!isNil(params.platformId)) {
                await authenticationUtils.assertEmailAuthIsEnabled({
                    platformId: params.platformId,
                    provider: params.provider,
                })
                await authenticationUtils.assertDomainIsAllowed({
                    email: params.email,
                    platformId: params.platformId,
                })
            }
            if (isNil(params.platformId)) {
                const userIdentity = await userIdentityService(log).create({
                    ...params,
                    verified: params.verified ?? (params.provider === UserIdentityProvider.GOOGLE || params.provider === UserIdentityProvider.JWT || params.provider === UserIdentityProvider.SAML),
                }, entityManager)
                return createUserAndPlatform(userIdentity, log, entityManager, params.companyName)
            }

            // Check if this is the first user on the platform (platform admin)
            log.info(`[Sign-Up] Checking user count for platform: ${params.platformId}`)
            const existingUsersCount = await userRepo(entityManager).countBy({ platformId: params.platformId })
            log.info(`[Sign-Up] Existing users count: ${existingUsersCount}`)
            
            if (existingUsersCount === 0) {
                log.info('[Sign-Up] First user detected - creating as PLATFORM ADMIN')
                // First user becomes platform admin
                const userIdentity = await userIdentityService(log).create({
                    ...params,
                    verified: params.verified ?? (params.provider === UserIdentityProvider.GOOGLE || params.provider === UserIdentityProvider.JWT || params.provider === UserIdentityProvider.SAML),
                }, entityManager)
                log.info(`[Sign-Up] User identity created: ${userIdentity.id}`)
                const user = await userService.create({
                    identityId: userIdentity.id,
                    platformRole: PlatformRole.ADMIN,
                    platformId: params.platformId,
                }, entityManager)
                log.info(`[Sign-Up] User created: ${user.id} with role: ADMIN`)
                
                const response = await authenticationUtils.getProjectAndToken({
                    user,
                    identity: userIdentity,
                    platformId: params.platformId,
                    projectId: null,
                    entityManager,
                })
                log.info('[Sign-Up] Token generated successfully')
                return response
            }

            log.info('[Sign-Up] Platform has existing users - requiring invitation')
            // For subsequent users, require invitation
            await authenticationUtils.assertUserIsInvitedToPlatformOrProject(log, {
                email: params.email,
                platformId: params.platformId,
            })
            const userIdentity = await userIdentityService(log).create({
                ...params,
                verified: true,
            }, entityManager)
            const user = await userService.create({
                identityId: userIdentity.id,
                platformRole: PlatformRole.MEMBER,
                platformId: params.platformId,
            }, entityManager)
            await userInvitationsService(log).provisionUserInvitation({
                email: params.email,
            })

            await processAcceptedInvitations(userIdentity, user, log, entityManager)

            return authenticationUtils.getProjectAndToken({
                user,
                identity: userIdentity,
                platformId: params.platformId,
                projectId: null,
                entityManager,
            })
        })
    },
    async signInWithPassword(params: SignInWithPasswordParams): Promise<AuthenticationResponse> {
        const identity = await userIdentityService(log).verifyIdentityPassword(params)
        const platformId = isNil(params.predefinedPlatformId) ? await getPersonalPlatformIdForIdentity(identity.id) : params.predefinedPlatformId
        if (isNil(platformId)) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHENTICATION,
                params: {
                    message: 'No platform found for identity',
                },
            })
        }
        await authenticationUtils.assertEmailAuthIsEnabled({
            platformId,
            provider: UserIdentityProvider.EMAIL,
        })
        await authenticationUtils.assertDomainIsAllowed({
            email: params.email,
            platformId,
        })
        const user = await userService.getOneByIdentityAndPlatform({
            identityId: identity.id,
            platformId,
        })
        assertNotNullOrUndefined(user, 'User not found')
        return authenticationUtils.getProjectAndToken({
            user,
            identity,
            platformId,
            projectId: null,
        })
    },
    async federatedAuthn(params: FederatedAuthnParams): Promise<AuthenticationResponse> {
        const platformId = isNil(params.predefinedPlatformId) ? await getPersonalPlatformIdForFederatedAuthn(params.email, log) : params.predefinedPlatformId
        const userIdentity = await userIdentityService(log).getIdentityByEmail(params.email)

        if (isNil(platformId)) {
            if (!isNil(userIdentity)) {
                // User already exists, create a new personal platform and return token
                return transaction(async (entityManager) => {
                    return createUserAndPlatform(userIdentity, log, entityManager)
                })
            }
            // Create New Identity and Platform
            return authenticationService(log).signUp({
                email: params.email,
                firstName: params.firstName,
                lastName: params.lastName,
                newsLetter: params.newsLetter,
                trackEvents: params.trackEvents,
                provider: params.provider,
                platformId: null,
                password: await cryptoUtils.generateRandomPassword(),
            })
        }
        if (isNil(userIdentity)) {
            return authenticationService(log).signUp({
                email: params.email,
                firstName: params.firstName,
                lastName: params.lastName,
                newsLetter: params.newsLetter,
                trackEvents: params.trackEvents,
                provider: params.provider,
                platformId,
                password: await cryptoUtils.generateRandomPassword(),
            })
        }
        await userInvitationsService(log).provisionUserInvitation({
            email: params.email,
        })
        const user = await userService.getOneByIdentityAndPlatform({
            identityId: userIdentity.id,
            platformId,
        })
        assertNotNullOrUndefined(user, 'User Identity is found but not the user')
        return authenticationUtils.getProjectAndToken({
            user,
            identity: userIdentity!,
            platformId,
            projectId: null,
        })
    },
    async switchPlatform(params: SwitchPlatformParams): Promise<AuthenticationResponse> {
        const platforms = await platformService.listPlatformsForIdentityWithAtleastProject({ identityId: params.identityId })
        const platform = platforms.find((platform) => platform.id === params.platformId)
        await assertUserCanSwitchToPlatform(null, platform)

        assertNotNullOrUndefined(platform, 'Platform not found')
        const user = await getUserForPlatform(params.identityId, platform)
        const identity = await userIdentityService(log).getOneOrFail({ id: params.identityId })
        return authenticationUtils.getProjectAndToken({
            user,
            identity,
            platformId: platform.id,
            projectId: null,
        })
    },
    async switchProject(params: SwitchProjectParams): Promise<AuthenticationResponse> {
        const project = await projectService.getOneOrThrow(params.projectId)
        const projectPlatform = await platformService.getOneWithPlanOrThrow(project.platformId)
        await assertUserCanSwitchToPlatform(params.currentPlatformId, projectPlatform)
        const user = await getUserForPlatform(params.identityId, projectPlatform)
        const identity = await userIdentityService(log).getOneOrFail({ id: params.identityId })
        return authenticationUtils.getProjectAndToken({
            user,
            identity,
            platformId: project.platformId,
            projectId: params.projectId,
            project: project,
        })
    },
    async verifyEmail(request: VerifyEmailRequestBody): Promise<void> {
        const secret = await jwtUtils.getJwtSecret()
        try {
             type VerificationPayload = { id: string, type: string }
             const payload = await jwtUtils.decodeAndVerify<VerificationPayload>({
                 jwt: request.otpcode,
                 key: secret,
             })

             if (payload.id !== request.identityId || payload.type !== 'VERIFY_EMAIL') {
                 throw new ActivepiecesError({
                     code: ErrorCode.INVALID_OTP,
                     params: {},
                 })
             }

             await userIdentityService(log).verify(request.identityId)
        } catch (e) {
             throw new ActivepiecesError({
                 code: ErrorCode.INVALID_OTP,
                 params: {},
             })
        }
    },
    async sendOtp(request: CreateOtpRequestBody): Promise<void> {
        const identity = await userIdentityService(log).getIdentityByEmail(request.email)
        if (isNil(identity)) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHENTICATION,
                params: {
                    message: 'User not found',
                },
            })
        }

        const secret = await jwtUtils.getJwtSecret()
        const token = await jwtUtils.sign({
            payload: { id: identity.id, type: 'VERIFY_EMAIL' },
            key: secret,
            expiresInSeconds: 86400, // 24 hours
        })
        const frontendUrl = system.getOrThrow(WorkerSystemProp.FRONTEND_URL)
        const link = `${frontendUrl}/verify-email?otpcode=${token}&identityId=${identity.id}`
        
        await emailService.sendVerificationEmail(identity.email, link)
    },
    
    async resendVerificationEmail(email: string): Promise<{ success: boolean }> {
        log.info(`[ResendVerification] Request received for ${email}`)
        
        const identity = await userIdentityService(log).getIdentityByEmail(email)
        if (isNil(identity)) {
            log.warn(`[ResendVerification] User not found: ${email}`)
            // Don't reveal if user exists or not for security
            return { success: true }
        }
        
        if (identity.verified) {
            log.info(`[ResendVerification] User already verified: ${email}`)
            // User already verified, no need to resend
            return { success: true }
        }
        
        const smtpHost = system.get(AppSystemProp.SMTP_HOST)
        if (!smtpHost) {
            log.info(`[ResendVerification] No SMTP configured, auto-verifying user`)
            await userIdentityService(log).verify(identity.id)
            return { success: true }
        }
        
        const secret = await jwtUtils.getJwtSecret()
        const token = await jwtUtils.sign({
            payload: { id: identity.id, type: 'VERIFY_EMAIL' },
            key: secret,
            expiresInSeconds: 86400, // 24 hours
        })
        const frontendUrl = system.getOrThrow(WorkerSystemProp.FRONTEND_URL)
        const link = `${frontendUrl}/verify-email?otpcode=${token}&identityId=${identity.id}`
        
        log.info(`[ResendVerification] Sending new verification email to ${email}`)
        await emailService.sendVerificationEmail(identity.email, link)
        log.info(`[ResendVerification] Email sent successfully to ${email}`)
        
        return { success: true }
    },

    async sendPasswordResetLink(email: string): Promise<void> {
        const identity = await userIdentityService(log).getIdentityByEmail(email)
        if (isNil(identity)) {
            return
        }
        
        const secret = await jwtUtils.getJwtSecret()
        const token = await jwtUtils.sign({
            payload: { id: identity.id, type: 'RESET_PASSWORD' },
            key: secret,
            expiresInSeconds: 3600, // 1 hour
        })
        const frontendUrl = system.getOrThrow(WorkerSystemProp.FRONTEND_URL)
        const link = `${frontendUrl}/reset-password?otpcode=${token}&identityId=${identity.id}`
        
        await emailService.sendPasswordResetCode(identity.email, link)
    },

    async resetPassword(request: ResetPasswordRequest): Promise<void> {
        const secret = await jwtUtils.getJwtSecret()
        try {
             type ResetPayload = { id: string, type: string }
             const payload = await jwtUtils.decodeAndVerify<ResetPayload>({
                 jwt: request.token,
                 key: secret,
             })

             if (payload.type !== 'RESET_PASSWORD') {
                 throw new ActivepiecesError({
                     code: ErrorCode.INVALID_OTP,
                     params: {},
                 })
             }

             const identity = await userIdentityService(log).getOneOrFail({ id: payload.id })
             await userIdentityService(log).update({
                id: identity.id,
                password: request.password,
                verified: true, // Auto-verify if they can reset password via email
             })
        } catch (e) {
             throw new ActivepiecesError({
                 code: ErrorCode.INVALID_OTP,
                 params: {},
             })
        }
    },
})

async function assertUserCanSwitchToPlatform(currentPlatformId: string | null, platform: PlatformWithoutSensitiveData | undefined): Promise<void> {
    if (isNil(platform)) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'The user is not a member of the platform',
            },
        })
    }
    const samePlatform = currentPlatformId === platform.id
    const allowToSwitch = !platformUtils.isCustomerOnDedicatedDomain(platform) || samePlatform
    if (!allowToSwitch) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHENTICATION,
            params: {
                message: 'The user is not a member of the platform',
            },
        })
    }
}

async function getUserForPlatform(identityId: string, platform: PlatformWithoutSensitiveData): Promise<User> {
    const user = await userService.getOneByIdentityAndPlatform({
        identityId,
        platformId: platform.id,
    })
    if (isNil(user)) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'User is not member of the platform',
            },
        })
    }
    return user
}

async function createUserAndPlatform(userIdentity: UserIdentity, log: FastifyBaseLogger, entityManager: EntityManager, companyName?: string): Promise<AuthenticationResponse> {
    const user = await userService.create({
        identityId: userIdentity.id,
        platformRole: PlatformRole.ADMIN,
        platformId: null,
    }, entityManager)
    
    // Use company name if provided, otherwise default to user's name
    const platformName = companyName || `${userIdentity.firstName}'s Workspace`
    log.info(`[Sign-Up] Creating platform: ${platformName}`)
    
    const platform = await platformService.create({
        ownerId: user.id,
        name: platformName,
    }, entityManager)
    await userService.addOwnerToPlatform({
        platformId: platform.id,
        id: user.id,
    }, entityManager)
    const defaultProject = await projectService.create({
        id: apId(),
        displayName: userIdentity.firstName + '\'s Project',
        ownerId: user.id,
        platformId: platform.id,
    }, entityManager)

    // Conditional Email Verification
    const smtpHost = system.get(AppSystemProp.SMTP_HOST)
    log.info(`[Sign-Up] SMTP Host config: ${smtpHost}`);
    try {
        if (smtpHost && !userIdentity.verified) {
             const secret = await jwtUtils.getJwtSecret()
             const token = await jwtUtils.sign({
                 payload: { id: userIdentity.id, type: 'VERIFY_EMAIL' },
                 key: secret,
                 expiresInSeconds: 86400, // 24 hours (increased from 1 hour)
             })
             const frontendUrl = system.getOrThrow(WorkerSystemProp.FRONTEND_URL)
             const link = `${frontendUrl}/verify-email?otpcode=${token}&identityId=${userIdentity.id}`
             
             log.info(`[Sign-Up] Sending verification email to ${userIdentity.email}`);
             await emailService.sendVerificationEmail(userIdentity.email, link)
             log.info(`[Sign-Up] Email sent (or queued)`);
        } else {
             log.info(`[Sign-Up] No SMTP host, auto-verifying user`);
             await userIdentityService(log).verify(userIdentity.id)
        }
    } catch (e) {
        log.warn({ name: 'AuthenticationService#createUserAndPlatform', error: e }, 'Failed to send verification email inside catch block')
    }

    try {
      await flagService.save({
          id: ApFlagId.USER_CREATED,
          value: true,
      }, entityManager)
      await authenticationUtils.sendTelemetry({
          identity: userIdentity,
          user,
          project: defaultProject,
          log,
      })
      await authenticationUtils.saveNewsLetterSubscriber(user, false, userIdentity, log)
    } catch (e) {
      log.warn({ name: 'AuthenticationService#createUserAndPlatform', error: e }, 'Non-critical signup side-effect failed')
    }

    await processAcceptedInvitations(userIdentity, user, log, entityManager)

    return authenticationUtils.getProjectAndToken({
        user,
        identity: userIdentity,
        platformId: platform.id,
        projectId: defaultProject.id,
        project: defaultProject,
        entityManager,
        ignoreVerified: true,
    })
}

async function getPersonalPlatformIdForFederatedAuthn(email: string, log: FastifyBaseLogger): Promise<string | null> {
    const identity = await userIdentityService(log).getIdentityByEmail(email)
    if (isNil(identity)) {
        return null
    }
    return getPersonalPlatformIdForIdentity(identity.id)
}

async function getPersonalPlatformIdForIdentity(identityId: string): Promise<string | null> {
    const edition = system.getEdition()
    if (edition === ApEdition.CLOUD) {
        const platforms = await platformService.listPlatformsForIdentityWithAtleastProject({ identityId })
        const platform = platforms.find((platform) => !platformUtils.isCustomerOnDedicatedDomain(platform))
        return platform?.id ?? null
    }
    // MULTI-TENANT COMMUNITY: Get user's platform from database
    const user = await userService.getOneByIdentityIdOnly({ identityId })
    return user?.platformId ?? null
}



type FederatedAuthnParams = {
    email: string
    firstName: string
    lastName: string
    newsLetter: boolean
    trackEvents: boolean
    provider: UserIdentityProvider
    predefinedPlatformId: string | null
}

type SignUpParams = {
    email: string
    firstName: string
    lastName: string
    password: string
    platformId: string | null
    trackEvents: boolean
    newsLetter: boolean
    provider: UserIdentityProvider
    companyName?: string
    verified?: boolean
}

type SignInWithPasswordParams = {
    email: string
    password: string
    predefinedPlatformId: string | null
}

type SwitchPlatformParams = {
    identityId: string
    platformId: string
}

type SwitchProjectParams = {
    identityId: string
    currentPlatformId: string
    projectId: string
}

    async function processAcceptedInvitations(userIdentity: UserIdentity, user: User, log: FastifyBaseLogger, entityManager: EntityManager): Promise<void> {
        try {
            log.info(`[AuthenticationService#processAcceptedInvitations] check invitations for ${userIdentity.email}`)
            const acceptedInvitations = await userInvitationsService(log).getAcceptedInvitations(userIdentity.email)
            log.info(`[AuthenticationService#processAcceptedInvitations] Found ${acceptedInvitations.length} accepted invitations`)
            for (const invitation of acceptedInvitations) {
                log.info(`[AuthenticationService#processAcceptedInvitations] Processing invitation: ${JSON.stringify(invitation)}`)
                if (invitation.type === InvitationType.PROJECT && invitation.projectId) {
                    log.info(`[Sign-Up] Adding user to invited project: ${invitation.projectId}`)
                    await projectMemberService.add({
                        projectId: invitation.projectId,
                        userId: user.id,
                        role: invitation.projectRoleId as ProjectMemberRole,
                    }, entityManager)
                }
            }
        } catch (e: any) {
            log.error({ error: e }, '[AuthenticationService] Failed to process accepted invitations')
        }
    }