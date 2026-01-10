import { QueueMetricsResponse, WorkerJobStats } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'

export const queueMetricService = (log: FastifyBaseLogger) => ({
    getMetrics: async (): Promise<QueueMetricsResponse> => {
        // CE: No real queue available, return empty stats
        return {
            stats: {
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0,
                waiting: 0,
            } as WorkerJobStats,
        }
    },
})

