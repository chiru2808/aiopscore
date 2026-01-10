
import {
    ApId,
    AppConnectionScope,
    AppConnectionWithoutSensitiveData,
    ListAppConnectionOwnersRequestQuery,
    ListAppConnectionsRequestQuery,
    Permission,
    PrincipalType,
    SeekPage,
    SERVICE_KEY_SECURITY_OPENAPI,
    UpdateConnectionValueRequestBody,
    UpsertAppConnectionRequestBody,
} from '@activepieces/shared'
import {
    FastifyPluginCallbackTypebox,
    Type,
} from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { eventsHooks } from '../helper/application-events'
import { securityHelper } from '../helper/security-helper'
import { appConnectionService } from './app-connection-service/app-connection-service'

export const appConnectionController: FastifyPluginCallbackTypebox = (app, _opts, done) => {
    app.post('/', UpsertAppConnectionRequest, async (request, reply) => {
        const appConnection = await appConnectionService.upsert({
            projectId: request.principal.projectId,
            platformId: (request.principal as any).platform?.id,
            request: {
                ...(request.body as any),
                value: request.body.value as any,
            } as any,
        })

        await reply
            .status(StatusCodes.CREATED)
            .send(appConnection)
    })


    app.post('/:id', UpdateConnectionValueRequest, async (request) => {
        // Note: Update not implemented in current service, using upsert as approximation
        const existing = await appConnectionService.getOne(request.params.id)
        if (!existing) {
            throw new Error('Connection not found')
        }
        const appConnection = await appConnectionService.upsert({
            projectId: request.principal.projectId,
            platformId: (request.principal as any).platform?.id,
            request: {
                externalId: existing.externalId,
                displayName: request.body.displayName,
                type: existing.type,
                value: existing.value as any, // keep existing value
                pieceName: (existing as any).pieceName,
                metadata: request.body.metadata,
            } as any,
        })
        return appConnection
    })


    app.get('/', ListAppConnectionsRequest, async (request): Promise<SeekPage<AppConnectionWithoutSensitiveData>> => {
        const { displayName, pieceName, status, cursor, limit, scope } = request.query

        const appConnections = await appConnectionService.list({
            projectId: request.principal.projectId,
            cursor: cursor ?? null,
            limit: limit ?? DEFAULT_PAGE_SIZE,
        })

        const appConnectionsWithoutSensitiveData: SeekPage<AppConnectionWithoutSensitiveData> = {
            ...appConnections,
            data: appConnections.data.map((conn) => ({ ...conn, value: undefined } as unknown as AppConnectionWithoutSensitiveData)), // placeholder for removeSensitiveData
        }
        return appConnectionsWithoutSensitiveData
    },
    )


    // app.post('/replace', ReplaceAppConnectionsRequest, async (request, reply) => {
    //     const { sourceAppConnectionId, targetAppConnectionId } = request.body
    //     await appConnectionService.replace({
    //         sourceAppConnectionId,
    //         targetAppConnectionId,
    //         projectId: request.principal.projectId,
    //         platformId: request.principal.platform.id,
    //         userId: request.principal.id,
    //     })
    //     await reply.status(StatusCodes.OK).send()
    // })

    app.delete('/:id', DeleteAppConnectionRequest, async (request, reply): Promise<void> => {
        const connection = await appConnectionService.getOneOrThrow(request.params.id)

        await appConnectionService.delete(request.params.id)
        await reply.status(StatusCodes.NO_CONTENT).send()
    })

    done()
}

const DEFAULT_PAGE_SIZE = 10


const UpsertAppConnectionRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        permission: Permission.WRITE_APP_CONNECTION,
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Upsert an app connection based on the app name',
        body: UpsertAppConnectionRequestBody,
        Response: {
            [StatusCodes.CREATED]: AppConnectionWithoutSensitiveData,
        },
    },
}

const UpdateConnectionValueRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        permission: Permission.WRITE_APP_CONNECTION,
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Update an app connection value',
        body: UpdateConnectionValueRequestBody,
        params: Type.Object({
            id: ApId,
        }),
    },
}



const ListAppConnectionsRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        permission: Permission.READ_APP_CONNECTION,
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        querystring: ListAppConnectionsRequestQuery,
        description: 'List app connections',
        response: {
            [StatusCodes.OK]: SeekPage(AppConnectionWithoutSensitiveData),
        },
    },
}


const DeleteAppConnectionRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        permission: Permission.WRITE_APP_CONNECTION,
    },
    schema: {
        tags: ['app-connections'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Delete an app connection',
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.NO_CONTENT]: Type.Never(),
        },
    },
}
