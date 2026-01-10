import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { billingService } from './billing.service'
import { StatusCodes } from 'http-status-codes'
import { Type } from '@sinclair/typebox'
import { Principal, PrincipalType, ProjectId } from '@activepieces/shared'

export const billingController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/checkout', {
        config: {
            allowedPrincipals: [PrincipalType.USER] as const,
        },
        schema: {
            response: {
                [StatusCodes.OK]: Type.Object({
                    url: Type.String(),
                }),
            },
        },
    }, async (request) => {
        const principal = request.principal as Principal & { projectId: ProjectId, email?: string }
        // Assuming user invokes this, and we use their project.
        // Needs a strategy to determine *which* project if they belong to multiple.
        // For now, assume projectId is passed or derived.
        // Actually, principal usually has projectId.
        return {
            url: await billingService.createCheckoutSession(principal.projectId, principal.email || 'test@example.com'), 
        }
    })

    app.post('/webhook', {
        config: {
            rawBody: true, // Needed for Stripe signature verification
            allowedPrincipals: [PrincipalType.UNKNOWN],
        },
    }, async (request, reply) => {
        await billingService.handleWebhook(request)
        reply.status(StatusCodes.OK).send()
    })
}
