import {
    ActivepiecesError,
    ALL_PRINCIPAL_TYPES,
    ApEdition,
    assertNotNullOrUndefined,
    DefaultProjectRole,
    EndpointScope,
    ErrorCode,
    InvitationStatus,
    InvitationType,
    isNil,
    ListUserInvitationsRequest,
    Permission,
    Principal,
    PrincipalType,
    ProjectMemberRole,
    ProjectRole,
    SeekPage,
    SendUserInvitationRequest,
    SERVICE_KEY_SECURITY_OPENAPI,
    UserInvitation,
    UserInvitationWithLink,
} from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import dayjs from 'dayjs'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { system } from '../helper/system/system'
import { projectService } from '../project/project-service'
import { userInvitationsService } from './user-invitation.service'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { platformService } from '../platform/platform.service'

export const invitationModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(invitationController, { prefix: '/v1/user-invitations' })
}

const invitationController: FastifyPluginAsyncTypebox = async (app) => {

    app.post('/', UpsertUserInvitationRequestParams, async (request, reply) => {
        const { email, type } = request.body
        switch (type) {
            case InvitationType.PROJECT:
                await assertPrincipalHasPermissionToProject(app, request, reply, request.principal, request.body.projectId, Permission.WRITE_INVITATION)
                break
            case InvitationType.PLATFORM:
                break
        }
        const status = request.principal.type === PrincipalType.SERVICE ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING
        const projectRole = await getProjectRoleAndAssertIfFound(request.principal.platform.id, request.body)
        const platformId = request.principal.platform.id

        const invitation = await userInvitationsService(request.log).create({
            email,
            type,
            platformId,
            platformRole: type === InvitationType.PROJECT ? null : request.body.platformRole,
            projectId: type === InvitationType.PLATFORM ? null : request.body.projectId,
            projectRoleId: type === InvitationType.PLATFORM ? null : projectRole?.id ?? null,
            status,
        })
        await reply.status(StatusCodes.CREATED).send(invitation)
    })

    app.get('/', ListUserInvitationsRequestParams, async (request, reply) => {
        if (!isNil(request.query.projectId) && request.query.type === InvitationType.PROJECT) {
        }
        const projectId = await getProjectIdAndAssertPermission(app, request, reply, request.principal, request.query)
        const invitations = await userInvitationsService(request.log).list({
            platformId: request.principal.platform.id,
            projectId: request.query.type === InvitationType.PROJECT ? projectId : null,
            type: request.query.type,
            status: request.query.status,
            cursor: request.query.cursor ?? undefined,
            limit: request.query.limit ?? 10,
        })
        await reply.status(StatusCodes.OK).send(invitations)
    })

    app.post('/accept', AcceptUserInvitationRequestParams, async (request, reply) => {
        request.log.info(`[UserInvitationModule#accept] Request received with token: ${request.body.invitationToken}`)
        const invitation = await userInvitationsService(request.log).getOneByInvitationTokenOrThrow(request.body.invitationToken)
        request.log.info(`[UserInvitationModule#accept] Invitation found: ${JSON.stringify(invitation)}`)
        
        await userInvitationsService(request.log).accept({
            invitationId: invitation.id,
            platformId: invitation.platformId,
        })
        
        // Enrich params
        let project = null
        if (invitation.projectId) {
             project = await projectService.getOne(invitation.projectId)
             request.log.info(`[UserInvitationModule#accept] Project lookup for ${invitation.projectId}: ${project ? 'Found' : 'Not Found'} with Name: ${project?.displayName}`)
        } else {
             request.log.info(`[UserInvitationModule#accept] No projectId in invitation`)
        }

        let platformName = null;
        if (invitation.platformId && !project) {
            const platform = await platformService.getOne(invitation.platformId);
            platformName = platform?.name;
            request.log.info(`[UserInvitationModule#accept] Platform name lookup for ${invitation.platformId}: ${platformName}`);
        }

        const identity = await userIdentityService(request.log).getIdentityByEmail(invitation.email)

        const response = {
            ...invitation,
            registered: !!identity,
            projectName: project?.displayName || platformName,
        }
        request.log.info(`[UserInvitationModule#accept] Sending response: ${JSON.stringify(response)}`)

        await reply.status(StatusCodes.OK).send(response)
    })

    app.delete('/:id', DeleteInvitationRequestParams, async (request, reply) => {
        const invitation = await userInvitationsService(request.log).getOneOrThrow({
            id: request.params.id,
            platformId: request.principal.platform.id,
        })
        switch (invitation.type) {
            case InvitationType.PROJECT: {
                assertNotNullOrUndefined(invitation.projectId, 'projectId')
                await assertPrincipalHasPermissionToProject(app, request, reply, request.principal, invitation.projectId, Permission.WRITE_INVITATION)
                break
            }
            case InvitationType.PLATFORM:
                break
        }
        await userInvitationsService(request.log).delete({
            id: request.params.id,
            platformId: request.principal.platform.id,
        })
        await reply.status(StatusCodes.NO_CONTENT).send()
    })
}


const roleIds: Record<string, string> = {
    [DefaultProjectRole.ADMIN]: '461ueYHzMykyk5dIL8HzQ',
    [DefaultProjectRole.EDITOR]: 'sjWe85TwaFYxyhn2AgOha',
    [DefaultProjectRole.OPERATOR]: '3Wl9IAw5aM0HLafHgMYkb',
    [DefaultProjectRole.VIEWER]: 'aJVBSSJ3YqZ7r1laFjM0a',
}

const getProjectRoleAndAssertIfFound = async (platformId: string, request: SendUserInvitationRequest): Promise<ProjectRole | null> => {
    const { type } = request
    if (type === InvitationType.PLATFORM) {
        return null
    }
    const projectRoleName = request.projectRole
    if (!projectRoleName) {
        return null
    }

    const edition = system.getEdition()
    if (edition === ApEdition.COMMUNITY) {
        // Map everything to MEMBER unless we want to support multiple owners via invitation
        // For simplicity and safety in CE, map to MEMBER.
        // The user complained about seeing "admin" or "operator", so maybe we should map ADMIN to OWNER?
        // But removing the last owner is dangerous, adding a second owner is fine.
        // For simplicity and safety in CE:
        // ADMIN -> OWNER
        // OPERATOR -> OPERATOR
        // All others -> MEMBER
        let role = ProjectMemberRole.MEMBER
        if (projectRoleName === DefaultProjectRole.ADMIN) {
            role = ProjectMemberRole.OWNER
        } else if (projectRoleName === DefaultProjectRole.OPERATOR) {
            role = ProjectMemberRole.OPERATOR
        }
        return {
            id: role, // This ID is what gets saved into project_member.role
            name: projectRoleName,
            permissions: [],
            type: 'CUSTOM',
            platformId: platformId,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        }
    }

    const roleId = roleIds[projectRoleName]
    if (roleId) {
        return {
            id: roleId,
            name: projectRoleName,
            permissions: [],
            type: 'CUSTOM',
            platformId: platformId,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        }
    }
    return null
}
async function getProjectIdAndAssertPermission<R extends Principal & { projectId: string }>(
    app: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
    principal: R,
    requestQuery: ListUserInvitationsRequest,
): Promise<string | null> {
    if (principal.type === PrincipalType.SERVICE) {
        if (isNil(requestQuery.projectId)) {
            return null
        }
        await assertPrincipalHasPermissionToProject(app, request, reply, principal, requestQuery.projectId, Permission.READ_INVITATION)
        return requestQuery.projectId
    }
    return principal.projectId
}


async function assertPrincipalHasPermissionToProject<R extends Principal & { platform: { id: string } }>(
    fastify: FastifyInstance,
    request: FastifyRequest, reply: FastifyReply, principal: R,
    projectId: string, permission: Permission): Promise<void> {
    const project = await projectService.getOneOrThrow(projectId)
    if (isNil(project) || project.platformId !== principal.platform.id) {
        throw new ActivepiecesError({
            code: ErrorCode.AUTHORIZATION,
            params: {
                message: 'user does not have access to the project',
            },
        })
    }
}


const ListUserInvitationsRequestParams = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        permission: Permission.READ_INVITATION,
        scope: EndpointScope.PLATFORM,
    },
    schema: {
        tags: ['user-invitations'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        querystring: ListUserInvitationsRequest,
        response: {
            [StatusCodes.OK]: SeekPage(UserInvitation),
        },
    },
}

const AcceptUserInvitationRequestParams = {
    config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
    },
    schema: {
        body: Type.Object({
            invitationToken: Type.String(),
        }),
    },
}

const DeleteInvitationRequestParams = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        scope: EndpointScope.PLATFORM,
    },
    schema: {
        tags: ['user-invitations'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        params: Type.Object({
            id: Type.String(),
        }),
        response: {
            [StatusCodes.NO_CONTENT]: Type.Never(),
        },
    },
}

const UpsertUserInvitationRequestParams = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        scope: EndpointScope.PLATFORM,
    },
    schema: {
        body: SendUserInvitationRequest,
        description: 'Send a user invitation to a user. If the user already has an invitation, the invitation will be updated.',
        tags: ['user-invitations'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        response: {
            [StatusCodes.CREATED]: UserInvitationWithLink,
        },
    },
}
