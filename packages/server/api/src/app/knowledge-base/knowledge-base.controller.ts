import { 
    PrincipalType, 
    ActivepiecesError, 
    ErrorCode, 
    SeekPage, 
    KnowledgeBase, 
    CreateKnowledgeBaseRequest,
    KnowledgeBaseStatus
} from '@activepieces/shared'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { apId } from '@activepieces/shared'
import { knowledgeBaseService } from './knowledge-base.service'

export const knowledgeBaseController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/', {
        schema: {
            body: CreateKnowledgeBaseRequest,
            response: {
                [StatusCodes.CREATED]: KnowledgeBase,
            },
        },
    }, async (request) => {
        return knowledgeBaseService(app.log).create({
            id: apId(),
            projectId: request.principal.projectId,
            displayName: request.body.displayName,
            description: request.body.description,
            type: request.body.type,
            status: KnowledgeBaseStatus.SYNCING, // Default to syncing, will process in background
            metadata: request.body.metadata,
        })
    })

    app.get('/', {
        schema: {
            querystring: Type.Object({
                limit: Type.Optional(Type.Number()),
                cursor: Type.Optional(Type.String()),
            }),
            response: {
                [StatusCodes.OK]: SeekPage(KnowledgeBase),
            },
        },
    }, async (request) => {
        return knowledgeBaseService(app.log).list({
            projectId: request.principal.projectId,
            limit: request.query.limit ?? 10,
            cursor: request.query.cursor ?? null,
        })
    })
}
