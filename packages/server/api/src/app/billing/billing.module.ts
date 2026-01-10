import { FastifyInstance } from 'fastify'
import { billingController } from './billing.controller'

export const billingModule = async (app: FastifyInstance) => {
    app.register(billingController, { prefix: '/v1/billing' })
}
