import {
    InvitationStatus,
    InvitationType,
    InviteProjectMemberRequest,
    ListProjectMembersRequestQuery,
    PrincipalType,
    ProjectMemberRole,
    ProjectMemberWithUser,
    SeekPage,
    UpdateProjectMemberRoleRequestBody,
} from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { projectMemberService } from './project-member.service'
import { userInvitationsService } from '../user-invitations/user-invitation.service'
import { userService } from '../user/user-service'
import { ApId } from '@activepieces/shared'

/**
 * Project Members API Controller
 * Handles team collaboration with 2-role system (Owner/Member)
 */
export const projectMembersController: FastifyPluginAsyncTypebox = async (app) => {
    
    // GET /v1/project-members/role - Get current user's role in current project
    app.get('/role', GetProjectRoleRequest, async (req) => {
        const role = await projectMemberService.getRole({
            projectId: req.principal.projectId,
            userId: req.principal.id,
        })
        
        // Return role or null if not a member
        return role
    })

    // GET /v1/project-members/count - Get count of members in current platform (for visibility)
    app.get('/count', CountProjectMembersRequest, async (req) => {
        const platformId = req.principal.platform.id
        // Return total platform users count to match the "Members" list visibility
        return userService.countByPlatform({ platformId })
    })

    // GET /v1/project-members - List all platform members with their project roles
    app.get('/', ListProjectMembersRequest, async (req): Promise<SeekPage<ProjectMemberWithUser>> => {
        const projectId = req.query.projectId ?? req.principal.projectId
        const platformId = req.principal.platform.id

        return projectMemberService.listPlatformUsersWithRoles({
            platformId,
            projectId,
            cursor: req.query.cursor ?? null,
            limit: req.query.limit ?? 50,
        })
    })

    // POST /v1/project-members/invite - Invite a new member by email
    app.post('/invite', InviteMemberRequest, async (req, reply) => {
        const { email, role } = req.body
        
        // Check if requester is owner
        const requesterRole = await projectMemberService.getRole({
            projectId: req.principal.projectId,
            userId: req.principal.id,
        })
        
        if (requesterRole !== ProjectMemberRole.OWNER) {
            return reply.code(StatusCodes.FORBIDDEN).send({
                message: 'Only project owners can invite members',
            })
        }

        const invitation = await userInvitationsService(req.log).create({
            email,
            type: InvitationType.PROJECT,
            projectId: req.principal.projectId,
            projectRoleId: role,
            platformId: req.principal.platform.id,
            status: InvitationStatus.PENDING,
            platformRole: null,
            invitationExpirySeconds: 3600 * 24 * 7, // 7 days
        })
        
        return reply.code(StatusCodes.CREATED).send(invitation)
    })

    // DELETE /v1/project-members/:id - Remove a member from project
    app.delete('/:id', RemoveMemberRequest, async (req, reply) => {
        await projectMemberService.remove({
            memberId: req.params.id,
            userId: req.principal.id,
        })

        return reply.code(StatusCodes.NO_CONTENT).send()
    })

    // POST /v1/project-members/:id - Update member role
    app.post('/:id', UpdateMemberRoleRequest, async (req) => {
        const updated = await projectMemberService.updateRole({
            memberId: req.params.id,
            role: req.body.role,
            userId: req.principal.id,
        })

        return updated
    })
}

const GetProjectRoleRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['project-members'],
        description: 'Get current user role in current project',
        response: {
            [StatusCodes.OK]: Type.Union([
                Type.Enum(ProjectMemberRole),
                Type.Null(),
            ]),
        },
    },
}

const ListProjectMembersRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['project-members'],
        description: 'List all members of a project',
        querystring: ListProjectMembersRequestQuery,
    },
}

const CountProjectMembersRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['project-members'],
        description: 'Get count of project members',
        response: {
            [StatusCodes.OK]: Type.Number(),
        },
    },
}

const InviteMemberRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['project-members'],
        description: 'Invite a new member to the project',
        body: InviteProjectMemberRequest,
        response: {
            [StatusCodes.CREATED]: Type.Any(), // Member or invitation response
        },
    },
}

const RemoveMemberRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['project-members'],
        description: 'Remove a member from the project',
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.NO_CONTENT]: Type.Never(),
        },
    },
}

const UpdateMemberRoleRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['project-members'],
        description: 'Update a member\'s role',
        params: Type.Object({
            id: ApId,
        }),
        body: UpdateProjectMemberRoleRequestBody,
    },
}
