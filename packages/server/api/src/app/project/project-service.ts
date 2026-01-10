import { ActivepiecesError, ColorName, ErrorCode, isNil, Project, ProjectId, ProjectMemberRole, ProjectType, SeekPage } from '@activepieces/shared'
import { EntityManager } from 'typeorm'
import { repoFactory } from '../core/db/repo-factory'
import { distributedStore } from '../database/redis-connections'
import { buildPaginator } from '../helper/pagination/build-paginator'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { system } from '../helper/system/system'
import { userService } from '../user/user-service'
import { ProjectEntity } from './project-entity'
import { projectMemberService } from './project-member.service'

export const projectRepo = repoFactory(ProjectEntity)

export const projectService = {
    async create(params: CreateParams, entityManager?: EntityManager): Promise<Project> {
        console.log('[ProjectService#create] Creating project with params:', params)
        const project = await projectRepo(entityManager).save({
            id: params.id,
            displayName: params.displayName,
            ownerId: params.ownerId,
            platformId: params.platformId,
            icon: {
                color: ColorName.BLUE,
            },
            type: ProjectType.TEAM,
        })
        
        // Automatically add creator as OWNER in project_member table
        // Gracefully fail if table doesn't exist yet (migration not run)
        try {
            await projectMemberService.add({
                projectId: project.id,
                userId: params.ownerId,
                role: ProjectMemberRole.OWNER,
            }, entityManager)
        } catch (error: any) {
            // Table might not exist yet - that's okay, we'll use ownerId field
            if (error.message?.includes('no such table: project_member')) {
                // Migration not run yet - skip project_member creation
            } else {
                // Re-throw other errors
                throw error
            }
        }
        
        return project
    },

    async getOne(id: ProjectId): Promise<Project | null> {
        return projectRepo().findOneBy({ id })
    },

    async getOneOrThrow(id: ProjectId): Promise<Project> {
        const project = await this.getOne(id)
        if (isNil(project)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: id,
                    entityType: 'Project',
                },
            })
        }
        return project
    },

    async list(params: ListParams): Promise<SeekPage<Project>> {
        const paginator = buildPaginator({
            entity: ProjectEntity,
            query: {
                limit: params.limit,
                afterCursor: params.cursor ?? undefined,
                order: 'ASC',
            },
        })

        const query = projectRepo().createQueryBuilder('project')
            .where('project.platformId = :platformId', { platformId: params.platformId })

        const { data, cursor } = await paginator.paginate(query)

        return {
            data,
            next: cursor.afterCursor,
            previous: cursor.beforeCursor,
        }
    },

    async getPlatformId(projectId: ProjectId): Promise<string> {
        const project = await this.getOneOrThrow(projectId)
        return project.platformId
    },

    async exists(params: { projectId: ProjectId }): Promise<boolean> {
        const project = await this.getOne(params.projectId)
        return !isNil(project)
    },

    async getAllForUser(params: { platformId: string, userId: string }, entityManager?: EntityManager): Promise<Project[]> {
        return projectRepo(entityManager).findBy({ platformId: params.platformId })
    },

    async getUserProjectOrThrow(userId: string): Promise<Project> {
        // Check project_member table for user's projects
        const projectIds = await projectMemberService.getUserProjects(userId)
        
        if (projectIds.length > 0) {
            const project = await this.getOne(projectIds[0])
            if (project) {
                return project
            }
        }
        
        // Fallback: check ownerId (for legacy compatibility)
        const ownedProjects = await projectRepo().findBy({ ownerId: userId })
        if (ownedProjects.length > 0) {
            return ownedProjects[0]
        }
        
        throw new ActivepiecesError({
            code: ErrorCode.ENTITY_NOT_FOUND,
            params: {
                entityId: userId,
                entityType: 'UserProject',
            },
        })
    },

    async getProjectIdsByPlatform(platformId: string): Promise<string[]> {
        const projects = await projectRepo().findBy({ platformId })
        return projects.map(p => p.id)
    },

    async userHasProjects(params: { platformId: string, userId: string }): Promise<boolean> {
        const projects = await this.getAllForUser(params)
        return projects.length > 0
    },

    async update(id: ProjectId, updates: Partial<Project>): Promise<Project> {
        // Cast to any to satisfy TypeORM's complex type requirements
        await projectRepo().update(id, updates as any)
        return this.getOneOrThrow(id)
    },
}

type CreateParams = {
    id: ProjectId
    displayName: string
    ownerId: string
    platformId: string
}

type ListParams = {
    platformId: string
    limit: number
    cursor: string | null
}
