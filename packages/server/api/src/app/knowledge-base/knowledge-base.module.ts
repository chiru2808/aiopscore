import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { knowledgeBaseController } from './knowledge-base.controller'

export const knowledgeBaseModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(knowledgeBaseController, { prefix: '/v1/knowledge-base' })
}
