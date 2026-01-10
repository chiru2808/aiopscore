import {
    ApId,
    assertNotNullOrUndefined,
    EndpointScope,
    ListUsersRequestBody,
    PrincipalType,
    SeekPage,
    SERVICE_KEY_SECURITY_OPENAPI,
    UpdateUserRequestBody,
    UserWithMetaInformation,
} from '@activepieces/shared'
import {
    FastifyPluginAsyncTypebox,
    Type,
} from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { userService } from '../user-service'

export const platformUserController: FastifyPluginAsyncTypebox = async (app) => {
    
    // GET /v1/users/me - Get current user profile
    app.get('/me', GetCurrentUserRequest, async (req) => {
        return userService.getMetaInformation({ id: req.principal.id })
    })


    // Existing endpoints below...
    app.get('/', ListUsersRequest, async (req) => {
        const platformId = req.principal.platform.id
        assertNotNullOrUndefined(platformId, 'platformId')

        return userService.list({
            platformId,
            externalId: req.query.externalId,
            cursorRequest: req.query.cursor ?? null,
            limit: req.query.limit ?? 10,
        })
    })

    app.post('/:id', UpdateUserRequest, async (req) => {
        const platformId = req.principal.platform.id
        assertNotNullOrUndefined(platformId, 'platformId')

        return userService.update({
            id: req.params.id,
            platformId,
            platformRole: req.body.platformRole,
            status: req.body.status,
            externalId: req.body.externalId,
        })
    })

    app.delete('/:id', DeleteUserRequest, async (req, res) => {
        const platformId = req.principal.platform.id
        assertNotNullOrUndefined(platformId, 'platformId')

        await userService.delete({
            id: req.params.id,
            platformId,
        })

        return res.status(StatusCodes.NO_CONTENT).send()
    })
}

const GetCurrentUserRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
    },
    schema: {
        tags: ['users'],
        description: 'Get current user profile',
    },
}


const ListUsersRequest = {
    schema: {
        querystring: ListUsersRequestBody,
        response: {
            [StatusCodes.OK]: SeekPage(UserWithMetaInformation),
        },
        tags: ['users'],
        description: 'List users',
        security: [SERVICE_KEY_SECURITY_OPENAPI],
    },
    response: {
        [StatusCodes.OK]: SeekPage(UserWithMetaInformation),
    },
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        scope: EndpointScope.PLATFORM,
    },
}

const UpdateUserRequest = {
    schema: {
        params: Type.Object({
            id: ApId,
        }),
        body: UpdateUserRequestBody,
        response: {
            [StatusCodes.OK]: UserWithMetaInformation,
        },
    },
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        scope: EndpointScope.PLATFORM,
    },
}

const DeleteUserRequest = {
    schema: {
        params: Type.Object({
            id: ApId,
        }),
    },
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        scope: EndpointScope.PLATFORM,
    },
}
