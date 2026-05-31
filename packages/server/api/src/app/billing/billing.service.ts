import Stripe from 'stripe'
import { system } from '../helper/system/system'
import { AppSystemProp, WorkerSystemProp } from '@activepieces/server-shared'
import { FastifyRequest } from 'fastify'
import { databaseConnection } from '../database/database-connection'
import { ProjectPlanEntity } from './project-plan.entity'
import { ApId, apId, ProjectId, ProjectPlan } from '@activepieces/shared'
import { ActivepiecesError, ErrorCode } from '@activepieces/shared'

const logger = system.globalLogger()

const stripeSecret = system.get(AppSystemProp.STRIPE_SECRET_KEY)
const webhookSecret = system.get(AppSystemProp.STRIPE_WEBHOOK_SECRET)

// Initialize Stripe only if key is present
const stripe = stripeSecret ? new Stripe(stripeSecret, {
    apiVersion: '2025-05-28.basil' as any,
}) : null

const projectPlanRepo = databaseConnection().getRepository(ProjectPlanEntity)

export const billingService = {
    async createCheckoutSession(projectId: ProjectId, userEmail: string): Promise<string> {
        if (!stripe) {
            throw new ActivepiecesError({
                code: ErrorCode.SYSTEM_PROP_INVALID,
                params: { prop: 'STRIPE_SECRET_KEY' },
            })
        }

        // TODO: Replace with actual price ID from environment or logic
        const priceId = process.env.STRIPE_PRICE_ID
        if (!priceId) {
             throw new Error('STRIPE_PRICE_ID not configured')
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: userEmail,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${system.get(WorkerSystemProp.FRONTEND_URL)}/settings/billing?success=true`,
            cancel_url: `${system.get(WorkerSystemProp.FRONTEND_URL)}/settings/billing?canceled=true`,
            metadata: {
                projectId,
            },
        })

        return session.url!
    },

    async handleWebhook(request: FastifyRequest): Promise<void> {
        if (!stripe || !webhookSecret) {
            throw new Error('Stripe not configured')
        }
        const sig = request.headers['stripe-signature'] as string
        let event: Stripe.Event

        try {
            const rawBody = (request as any).rawBody
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
        } catch (err) {
            logger.error(err, '[BillingService#handleWebhook] Webhook signature verification failed')
            throw new Error('Webhook signature verification failed')
        }
        
        logger.info(`[BillingService#handleWebhook] Received event: ${event.type}`)

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const projectId = session.metadata?.projectId as ProjectId
                
                if (projectId) {
                    await this.updateProjectPlan(projectId, {
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string,
                        name: 'PRO', // Assume Pro plan
                        subscriptionStartDatetime: new Date().toISOString(),
                    })
                }
                break
            }
            case 'customer.subscription.updated': {
                 const subscription = event.data.object as Stripe.Subscription
                 const projectId = subscription.metadata?.projectId as ProjectId
                 // Sync status, etc.
                 if (projectId && subscription.status === 'active') {
                      await this.updateProjectPlan(projectId, {
                         stripeSubscriptionId: subscription.id,
                         // simplistic tier logic
                         name: 'PRO', 
                      })
                 }
                 break
            }
             case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const projectId = subscription.metadata?.projectId as ProjectId
                if (projectId) {
                    // Revert to Free
                     await this.updateProjectPlan(projectId, {
                         stripeSubscriptionId: undefined,
                         stripeCustomerId: undefined,
                         name: 'FREE',
                         subscriptionStartDatetime: new Date().toISOString(),
                     })
                }
                 break
            }
        }
    },

    async updateProjectPlan(projectId: ProjectId, data: Partial<ProjectPlan>): Promise<void> {
        const existing = await projectPlanRepo.findOneBy({ projectId })
        if (existing) {
            await projectPlanRepo.update({ projectId }, data)
        } else {
             await projectPlanRepo.save({
                 id: apId(),
                 projectId,
                 ...data,
                 // defaults
                 name: data.name || 'FREE',
                 subscriptionStartDatetime: data.subscriptionStartDatetime || new Date().toISOString()
             })
        }
    }
}
