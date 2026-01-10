import { ActivepiecesError, apId, ErrorCode, InvitationStatus, InvitationType, ListUserInvitationsRequest, ProjectMemberRole, SeekPage, UserInvitation, UserInvitationWithLink, isNil } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { UserInvitationEntity } from './user-invitation.entity'
import { projectMemberService } from '../project/project-member.service'
import { projectService } from '../project/project-service'
import { userService } from '../user/user-service'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { buildPaginator } from '../helper/pagination/build-paginator'
import { system } from '../helper/system/system'
import { AppSystemProp, WorkerSystemProp } from '@activepieces/server-shared'

import { emailService } from '../email/email.service'

const userInvitationRepo = repoFactory(UserInvitationEntity)

export const userInvitationsService = (log: FastifyBaseLogger) => ({
    async create(request: Partial<UserInvitation>): Promise<UserInvitationWithLink> {
        request.email = request.email?.toLowerCase()
        const existingInvitation = await userInvitationRepo().findOneBy({
            email: request.email,
            platformId: request.platformId,
            status: InvitationStatus.PENDING,
        })

        let invitation: UserInvitation
        if (existingInvitation) {
            // Reuse existing invitation
            const { projectRole, project, ...rest } = existingInvitation
            const { projectRole: _pr, ...requestRest } = request
             invitation = await userInvitationRepo().save({
                ...rest,
                ...requestRest,
                updated: new Date().toISOString(),
            })
            log.info(`[UserInvitationService#create] Reusing existing invitation for ${request.email}`)
        } else {
             const { projectRole, ...rest } = request
             invitation = await userInvitationRepo().save({
                id: apId(),
                ...rest,
            })
        }
        
        const enriched = enrichWithInvitationLink(invitation)
        try {
            await emailService.sendInvitation(enriched.email, enriched.link)
            log.info(`[UserInvitationService#create] Invitation email sent to ${enriched.email}`)
        } catch (e) {
            log.error({ error: e }, `[UserInvitationService#create] Failed to send invitation email to ${enriched.email}`)
            // Do not throw error, allow invitation to be created
        }
        return enriched
    },

    async list(params: ListUserInvitationsRequest & { platformId: string }): Promise<SeekPage<UserInvitation>> {
        const { platformId, status, type, limit, cursor } = params
        const decodedCursor = paginationHelper.decodeCursor(cursor ?? null)
        const paginator = buildPaginator({
            entity: UserInvitationEntity,
            query: {
                limit: limit ?? 10,
                order: 'ASC',
                afterCursor: decodedCursor.nextCursor,
                beforeCursor: decodedCursor.previousCursor,
            },
        })
        const { data, cursor: paginationCursor } = await paginator.paginate(userInvitationRepo().createQueryBuilder('user_invitation').where({
            platformId,
            ...(status ? { status } : {}),
            ...(type ? { type } : {}),
        }))
        return {
            data,
            next: paginationCursor.afterCursor,
            previous: paginationCursor.beforeCursor,
        }
    },

    async getOneByInvitationTokenOrThrow(token: string): Promise<UserInvitation> {
        const invitation = await userInvitationRepo().findOneBy({
            id: token,
        })
        if (isNil(invitation)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    message: 'Invitation not found',
                },
            })
        }
        return invitation as UserInvitation
    },

    async accept(params: { invitationId: string, platformId: string }): Promise<{ registered: boolean, projectName?: string, platformId: string }> {
        const invitation = await userInvitationRepo().findOneBy({
            id: params.invitationId,
            platformId: params.platformId,
        })
        if (isNil(invitation)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    message: `Invitation ${params.invitationId} not found`,
                },
            })
        }
        if (invitation.status !== InvitationStatus.PENDING) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Invitation is not pending',
                },
            })
        }

        let projectName
        if (invitation.type === InvitationType.PROJECT) {
            const project = await projectService.getOne(invitation.projectId!)
            projectName = project?.displayName

            const identity = await userIdentityService(log).getIdentityByEmail(invitation.email)
            if (identity) {
                const user = await userService.getOneByIdentityAndPlatform({
                    identityId: identity.id,
                    platformId: invitation.platformId
                })
                if (user) {
                    await projectMemberService.add({
                        projectId: invitation.projectId!,
                        userId: user.id,
                        role: invitation.projectRoleId as ProjectMemberRole,
                    })
                }
            }
        }

        await userInvitationRepo().update(invitation.id, {
            status: InvitationStatus.ACCEPTED,
        })

        const identity = await userIdentityService(log).getIdentityByEmail(invitation.email)
        return {
            registered: !isNil(identity),
            projectName,
            platformId: invitation.platformId,
        }
    },

    async getOneOrThrow(params: { id: string, platformId: string }): Promise<UserInvitation> {
        const invitation = await userInvitationRepo().findOneBy({
            id: params.id,
            platformId: params.platformId,
        })
        if (!invitation) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    message: `Invitation ${params.id} not found`,
                },
            })
        }
        return invitation
    },

    async delete(params: { id: string, platformId: string }): Promise<void> {
        await userInvitationRepo().delete({
            id: params.id,
            platformId: params.platformId,
        })
    },

    // CE: Auto-provision user invitations (no-op for CE)
    async provisionUserInvitation({ email }: { email: string }): Promise<void> {
        log.info({ email }, '[userInvitationsService#provisionUserInvitation] CE: Auto-provision skipped')
        // CE: No automatic provisioning needed in Community Edition
    },

    // CE: Check if user has any accepted invitations
    async hasAnyAcceptedInvitations({ platformId, email }: { 
        platformId: string
        email: string  
    }): Promise<boolean> {
        const invitation = await userInvitationRepo().findOneBy({
            platformId,
            email,
            status: InvitationStatus.ACCEPTED,
        })
        return invitation !== null
    },

    async getAcceptedInvitations(email: string): Promise<UserInvitation[]> {
        return userInvitationRepo().findBy({
            email: email.toLowerCase(),
            status: InvitationStatus.ACCEPTED,
        })
    },
})

const enrichWithInvitationLink = (userInvitation: UserInvitation): UserInvitationWithLink => {
    const frontendUrl = system.getOrThrow(WorkerSystemProp.FRONTEND_URL)
    const invitationLink = `${frontendUrl}/invitation?token=${userInvitation.id}&email=${encodeURIComponent(userInvitation.email)}`
    return {
        ...userInvitation,
        link: invitationLink,
    }
}
