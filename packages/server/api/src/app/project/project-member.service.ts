import {
    ActivepiecesError,
    apId,
    ErrorCode,
    InvitationStatus,
    isNil,
    ProjectId,
    ProjectMember,
    ProjectMemberRole,
    ProjectMemberWithUser,
    SeekPage,
    UserId,
} from '@activepieces/shared'
import { EntityManager } from 'typeorm'
import { repoFactory } from '../core/db/repo-factory'
import { buildPaginator } from '../helper/pagination/build-paginator'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { userService } from '../user/user-service'
import { ProjectMemberEntity, ProjectMemberSchema } from './project-member.entity'

const projectMemberRepo = repoFactory(ProjectMemberEntity)

export const projectMemberService = {
    /**
     * Add a user to a project with a specific role
     */
    async add({ projectId, userId, role, invitedBy }: AddParams, entityManager?: EntityManager): Promise<ProjectMember> {
        const existingMember = await projectMemberRepo(entityManager).findOneBy({
            projectId,
            userId,
        })

        if (existingMember) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'User is already a member of this project',
                },
            })
        }

        const newMember: Omit<ProjectMemberSchema, 'created' | 'updated'> = {
            id: apId(),
            projectId,
            userId,
            role,
            invitedBy: invitedBy ?? null,
        }

        return projectMemberRepo(entityManager).save(newMember)
    },

    /**
     * List all members of a project with their user information
     */
    async list({ projectId, cursor, limit }: ListParams): Promise<SeekPage<ProjectMemberWithUser>> {
        const decodedCursor = paginationHelper.decodeCursor(cursor ?? null)
        
        const paginator = buildPaginator({
            entity: ProjectMemberEntity,
            query: {
                limit: limit ?? 50,
                afterCursor: decodedCursor.nextCursor,
                beforeCursor: decodedCursor.previousCursor,
            },
        })

        const queryBuilder = projectMemberRepo()
            .createQueryBuilder('project_member')
            .where('project_member.projectId = :projectId', { projectId })
            .orderBy('project_member.created', 'ASC')

        const { data, cursor: paginationCursor } = await paginator.paginate(queryBuilder)

        // Enrich with user information
        const membersWithUsers = await Promise.all(
            data.map(async (member) => {
                const user = await userService.getMetaInformation({ id: member.userId })
                return {
                    ...member,
                    user,
                } as ProjectMemberWithUser
            }),
        )

        return paginationHelper.createPage<ProjectMemberWithUser>(membersWithUsers, paginationCursor)
    },

    /**
     * List all platform users and their roles in the project
     */
    async listPlatformUsersWithRoles({ platformId, projectId, cursor, limit }: ListPlatformUsersParams): Promise<SeekPage<ProjectMemberWithUser>> {
        const usersPage = await userService.list({
            platformId,
            cursorRequest: cursor ?? null,
            limit: limit ?? 50,
        })

        const enrichedUsers = await Promise.all(usersPage.data.map(async (user) => {
             const projectMember = await projectMemberRepo().findOneBy({
                 projectId,
                 userId: user.id
             })

             if (projectMember) {
                 return {
                     ...projectMember,
                     user,
                 } as ProjectMemberWithUser
             }

             // If not in project, return a dummy member structure with null role (frontend should handle this)
             // Or better, we can return the user with undefined role property if type allows, 
             // but ProjectMemberWithUser expects ProjectMember properties.
             // We'll mock a "Pending/None" member.
             return {
                 id: user.id, // Hack: use user ID as member ID for keying
                 projectId,
                 userId: user.id,
                 role: null as any, // Frontend check: if role is null, show "Add to Project"
                 created: user.created,
                 updated: user.updated,
                 user,
                 status: InvitationStatus.PENDING, // Or some indicator
             } as unknown as ProjectMemberWithUser
        }))

        return {
            data: enrichedUsers,
            next: usersPage.next,
            previous: usersPage.previous,
        }
    },

    /**
     * Get a user's role in a specific project
     */
    async getRole({ projectId, userId }: GetRoleParams): Promise<ProjectMemberRole | null> {
        const member = await projectMemberRepo().findOneBy({
            projectId,
            userId,
        })
        return member?.role ?? null
    },

    /**
     * Check if a user is a member of a project
     */
    async isMember({ projectId, userId }: IsMemberParams): Promise<boolean> {
        const member = await projectMemberRepo().findOneBy({
            projectId,
            userId,
        })
        return !isNil(member)
    },

    async count(projectId: ProjectId): Promise<number> {
        return projectMemberRepo().countBy({ projectId })
    },

    /**
     * Remove a member from a project
     */
    async remove({ memberId, userId }: RemoveParams): Promise<void> {
        const member = await projectMemberRepo().findOneBy({ id: memberId })
        
        if (isNil(member)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityType: 'ProjectMember',
                    entityId: memberId,
                },
            })
        }

        // Check authorization - only owner or the user themselves can remove
        const requesterRole = await this.getRole({ projectId: member.projectId, userId })
        
        if (requesterRole !== ProjectMemberRole.OWNER && member.userId !== userId) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Only project owners can remove members',
                },
            })
        }

        // Prevent removing the last owner
        if (member.role === ProjectMemberRole.OWNER) {
            const owners = await projectMemberRepo().findBy({
                projectId: member.projectId,
                role: ProjectMemberRole.OWNER,
            })

            if (owners.length === 1) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: 'Cannot remove the last owner of the project',
                    },
                })
            }
        }

        await projectMemberRepo().delete({ id: memberId })
    },

    /**
     * Update a member's role
     */
    async updateRole({ memberId, role, userId }: UpdateRoleParams): Promise<ProjectMember> {
        const member = await projectMemberRepo().findOneBy({ id: memberId })
        
        if (isNil(member)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityType: 'ProjectMember',
                    entityId: memberId,
                },
            })
        }

        // Check authorization - only owner can update roles
        const requesterRole = await this.getRole({ projectId: member.projectId, userId })
        
        if (requesterRole !== ProjectMemberRole.OWNER) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Only project owners can update member roles',
                },
            })
        }

        // Prevent demoting the last owner
        if (member.role === ProjectMemberRole.OWNER && role !== ProjectMemberRole.OWNER) {
            const owners = await projectMemberRepo().findBy({
                projectId: member.projectId,
                role: ProjectMemberRole.OWNER,
            })

            if (owners.length === 1) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: 'Cannot demote the last owner of the project',
                    },
                })
            }
        }

        await projectMemberRepo().update({ id: memberId }, { role })
        
        const updated = await projectMemberRepo().findOneByOrFail({ id: memberId })
        return updated
    },

    /**
     * Get all projects a user is a member of
     */
    async getUserProjects(userId: UserId): Promise<ProjectId[]> {
        const members = await projectMemberRepo().findBy({ userId })
        return members.map(m => m.projectId)
    },
}

type AddParams = {
    projectId: ProjectId
    userId: UserId
    role: ProjectMemberRole
    invitedBy?: UserId
}

type ListParams = {
    projectId: ProjectId
    cursor?: string | null
    limit?: number
}

type GetRoleParams = {
    projectId: ProjectId
    userId: UserId
}

type IsMemberParams = {
    projectId: ProjectId
    userId: UserId
}

type RemoveParams = {
    memberId: string
    userId: UserId // For authorization
}

type UpdateRoleParams = {
    memberId: string
    role: ProjectMemberRole
    userId: UserId // For authorization
}

type ListPlatformUsersParams = {
    platformId: string
    projectId: string
    cursor?: string | null
    limit?: number
}
