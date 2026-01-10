import { ActivepiecesError, AppConnection, AppConnectionId, AppConnectionScope, AppConnectionStatus, AppConnectionType, ErrorCode, isNil, PlatformId, ProjectId, SeekPage, UpsertAppConnectionRequestBody } from '@activepieces/shared'
import { repoFactory } from '../../core/db/repo-factory'
import { AddAPArrayContainsToQueryBuilder, APArrayContains } from '../../database/database-connection'
import { encryptUtils } from '../../helper/encryption'
import { buildPaginator } from '../../helper/pagination/build-paginator'
import { AppConnectionEntity } from '../app-connection.entity'

const appConnectionsRepo = repoFactory(AppConnectionEntity)

const appConnectionService = {
    async upsert({ projectId, platformId, request }: UpsertParams): Promise<AppConnection> {
        if (isNil(request.value)) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Connection value is required',
                },
            })
        }

        let encryptedValue: any
        let status: AppConnectionStatus
        try {
            encryptedValue = await encryptUtils.encryptObject(request.value)
            status = AppConnectionStatus.ACTIVE
        } catch (error) {
            status = AppConnectionStatus.ERROR
            encryptedValue = null
        }

        const appConnection = await appConnectionsRepo().save({
            externalId: request.externalId,
            displayName: request.displayName,
            type: request.type,
            pieceName: (request as any).pieceName || 'unknown',
            projectIds: [projectId],
            platformId: platformId || 'default-platform',
            scope: AppConnectionScope.PROJECT,
            status,
            value: encryptedValue,
            metadata: (request as any).metadata,
        })

        return appConnection
    },

    async getOne(id: AppConnectionId): Promise<AppConnection | null> {
        const appConnection = await appConnectionsRepo().findOneBy({ id })
        if (isNil(appConnection)) {
            return null
        }
        const decryptedValue = await encryptUtils.decryptObject(appConnection.value) as any
        return {
            ...appConnection,
            value: decryptedValue,
        } as AppConnection
    },

    async getOneOrThrow(id: AppConnectionId): Promise<AppConnection> {
        const appConnection = await this.getOne(id)
        if (isNil(appConnection)) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityId: id,
                    entityType: 'AppConnection',
                },
            })
        }
        return appConnection
    },

    async delete(id: AppConnectionId): Promise<void> {
        await appConnectionsRepo().delete({ id })
    },

    async list({ projectId, cursor, limit }: ListParams): Promise<SeekPage<AppConnection>> {
        const paginator = buildPaginator({
            entity: AppConnectionEntity,
            query: {
                limit,
                afterCursor: cursor ?? undefined,
                order: 'ASC',
            },
        })

        const query = appConnectionsRepo().createQueryBuilder('app_connection')
        
        // Handle projectIds array for CE compatibility
        AddAPArrayContainsToQueryBuilder(query, 'app_connection."projectIds"', [projectId])

        const { data, cursor: paginationCursor } = await paginator.paginate(query)

        const decryptedData = await Promise.all(data.map(async (item) => ({
            ...item,
            value: await encryptUtils.decryptObject(item.value),
        })))

        return {
            data: decryptedData as any,
            next: paginationCursor.afterCursor,
            previous: paginationCursor.beforeCursor,
        }
    },

    async getMany(ids: readonly AppConnectionId[]): Promise<AppConnection[]> {
        if (ids.length === 0) {
            return []
        }
        if (ids.length > 1000) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Cannot fetch more than 1000 connections at once',
                },
            })
        }
        const connections = await appConnectionsRepo().findBy(
            APArrayContains('id', [...ids])
        )
        return Promise.all(connections.map(async (item) => ({
            ...item,
            value: await encryptUtils.decryptObject(item.value) as any,
        }))) as Promise<AppConnection[]>
    },

    async getOneByProjectIdAndName({ projectId, name }: GetOneByProjectIdAndNameParams): Promise<AppConnection | null> {
        const connection = await appConnectionsRepo().findOneBy({
            displayName: name,
        } as any)
        if (isNil(connection)) {
            return null
        }
        const decryptedValue = await encryptUtils.decryptObject(connection.value) as any
        return {
            ...connection,
            value: decryptedValue,
        } as AppConnection
    },

    async getOneByProjectIdAndExternalId({ projectId, externalId }: GetOneByProjectIdAndExternalIdParams): Promise<AppConnection | null> {
        const connection = await appConnectionsRepo().findOneBy({
            projectId,
            externalId,
        } as any)
        if (isNil(connection)) {
            return null
        }
        const decryptedValue = await encryptUtils.decryptObject(connection.value) as any
        return {
            ...connection,
            value: decryptedValue,
        } as AppConnection
    },
}

export { appConnectionService, appConnectionsRepo }

type UpsertParams = {
    projectId: ProjectId
    platformId?: PlatformId
    request: UpsertAppConnectionRequestBody
}

type ListParams = {
    projectId: ProjectId
    cursor: string | null
    limit: number
}

type GetOneByProjectIdAndNameParams = {
    projectId: ProjectId
    name: string
}

type GetOneByProjectIdAndExternalIdParams = {
    projectId: ProjectId
    externalId: string
}
