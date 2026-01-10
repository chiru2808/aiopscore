import { FastifyBaseLogger } from 'fastify'
import pino, { Level, Logger } from 'pino'
// import 'pino-loki'
// import { createHyperDXTransport, HyperDXCredentials } from './hyperdx-pino'
// import { createLokiTransport, LokiCredentials } from './loki-pino'

export const pinoLogging = {
    initLogger: (loggerLevel: Level | undefined, logPretty: boolean, _loki: any, _hyperdx: any): Logger => {
        const level: Level = loggerLevel ?? 'info'
        const pretty = logPretty ?? false

        if (pretty) {
            return pino({
                level,
                transport: {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        colorize: true,
                        ignore: 'pid,hostname',
                    },
                },
            })
        }
        




        // Default logger
        return pino({
            level,
        })
    },
    createRunContextLog: ({ log, runId, webhookId, flowId, flowVersionId }: { log: FastifyBaseLogger, runId: string, webhookId: string | undefined, flowId: string, flowVersionId: string }) => {
        return log.child({ runId, webhookId, flowId, flowVersionId })
    },
    createWebhookContextLog: ({ log, webhookId, flowId }: { log: FastifyBaseLogger, webhookId: string, flowId: string }) => {
        return log.child({ webhookId, flowId })
    },
}
