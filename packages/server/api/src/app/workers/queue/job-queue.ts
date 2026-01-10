import type { FastifyBaseLogger } from 'fastify'
import type { AddJobParams, JobType } from './queue-manager'

// CE stub implementation - simplified job queue for community edition
export const jobQueue = (log: FastifyBaseLogger) => ({
    async init(): Promise<void> {
        log.info('[jobQueue#init] Initializing job queue (CE stub)')
        // CE: No dedicated workers, just log initialization
    },

    async add(params: AddJobParams<JobType>): Promise<void> {
        log.info({ id: params.id, type: params.type }, '[jobQueue#add] Adding job (CE stub)')
        // CE: Just log the job addition, don't actually queue it
    },

    async removeOneTimeJob(params: { jobId: string; platformId: string }): Promise<void> {
        log.info({ jobId: params.jobId, platformId: params.platformId }, '[jobQueue#removeOneTimeJob] Removing one-time job (CE stub)')
        // CE: Just log the removal
    },


    async removeRepeatingJob(params: { flowVersionId: string }): Promise<void> {
        log.info({ flowVersionId: params.flowVersionId }, '[jobQueue#removeRepeatingJob] Removing repeating job (CE stub)')
        // CE: Just log the removal
    },

    getSharedQueue(): null {
        log.info('[jobQueue#getSharedQueue] Getting shared queue (CE stub)')
        // CE: Return null to indicate no queue available
        return null
    },

    getAllQueues(): never[] {
        log.info('[jobQueue#getAllQueues] Getting all queues (CE stub)')
        // CE: Return empty array
        return []
    },

    async close(): Promise<void> {
        log.info('[jobQueue#close] Closing job queue (CE stub)')
        // CE: Nothing to close
    },
})
