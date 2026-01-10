import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { platformUserController } from './platform-user-controller'

export const platformUserModule: FastifyPluginAsyncTypebox = async (app) => {
    // CE stub - no platform ownership validation
    await app.register(platformUserController, { prefix: '/v1/users' })
}
