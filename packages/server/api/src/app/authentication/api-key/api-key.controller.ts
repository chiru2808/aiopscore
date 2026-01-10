import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { apiKeyService } from './api-key.service'
import { StatusCodes } from 'http-status-codes'
import { CreateApiKeyRequest, CreateApiKeyResponse, ListApiKeyResponse, Principal, PrincipalType, ServicePrincipal, UserPrincipal } from '@activepieces/shared'
import { Type } from '@sinclair/typebox'

export const apiKeyController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/', {
        schema: {
            body: CreateApiKeyRequest,
            response: {
                [StatusCodes.CREATED]: CreateApiKeyResponse,
            },
        },
    }, async (request, reply) => {
        const principal = request.principal as UserPrincipal | ServicePrincipal
        const apiKey = await apiKeyService.create({
            projectId: principal.projectId,
            platformId: principal.platform.id,
            displayName: request.body.displayName,
        })
        return reply.status(StatusCodes.CREATED).send(apiKey)
    })

    app.get('/', {
        schema: {
            response: {
                [StatusCodes.OK]: ListApiKeyResponse,
            },
        },
    }, async (request) => {
        return apiKeyService.list((request.principal as UserPrincipal | ServicePrincipal).projectId)
    })

    app.delete('/:id', {
        schema: {
            params: Type.Object({
                id: Type.String(),
            }),
            response: {
                [StatusCodes.NO_CONTENT]: Type.Never(),
            },
        },
    }, async (request, reply) => {
        await apiKeyService.delete(request.params.id, (request.principal as UserPrincipal | ServicePrincipal).projectId)
        return reply.status(StatusCodes.NO_CONTENT).send()
    })
}
