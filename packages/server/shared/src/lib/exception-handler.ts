
import { FastifyBaseLogger } from 'fastify'

let sentryInitialized = false

export const exceptionHandler = {
    initializeSentry: (_sentryDsn: string | undefined) => {
        // Sentry is not supported in this version
    },
    handle: (e: unknown, log: FastifyBaseLogger): void => {
        log.error(e)

    },
}
