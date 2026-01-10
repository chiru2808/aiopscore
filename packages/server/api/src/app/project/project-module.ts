import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { projectController, userProjectController } from './project-controller'
import { projectMembersController } from './project-members.controller'
import { projectWorkerController } from './project-worker-controller'

export const projectModule: FastifyPluginAsyncTypebox = async (app) => {
    await app.register(userProjectController, { prefix: '/v1/users/projects' })
    await app.register(projectController, { prefix: '/v1/projects' })
    await app.register(projectMembersController, { prefix: '/v1/project-members' })
    await app.register(projectWorkerController, { prefix: '/v1/worker/project' })
}
