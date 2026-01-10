console.log('[DEBUG] main.ts file (console.log) loading...')
process.stdout.write('[DEBUG] main.ts file (stdout.write) loading...\n');

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log('DEBUG: main.ts loaded')
// import './instrumentation'

import dayjs from 'dayjs'
import { FastifyInstance } from 'fastify'
import { appPostBoot } from './app/app'
import { initializeDatabase } from './app/database'
import { distributedLock } from './app/database/redis-connections'
import { system } from './app/helper/system/system'
import { setupServer } from './app/server'
import { workerPostBoot } from './app/worker'

const start = async (app: FastifyInstance): Promise<void> => {
    try {
        console.log('[DEBUG] app.listen() called...')
        await app.listen({
            host: '0.0.0.0',
            port: 3000,
        })
        console.log('[DEBUG] app.listen() success!')
        if (system.isWorker()) {
            await workerPostBoot(app)
        }
        if (system.isApp()) {
            await appPostBoot(app)
        }
    }
    catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

// This might be needed as it can be called twice
let shuttingDown = false


const stop = async (app: FastifyInstance): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true

    try {
        await app.close()
        process.exit(0)
    }
    catch (err) {
        app.log.error('Error stopping server')
        app.log.error(err)
        process.exit(1)
    }
}

function setupTimeZone(): void {
    // It's important to set the time zone to UTC when working with dates in PostgreSQL.
    // If the time zone is not set to UTC, there can be problems when storing dates in UTC but not considering the UTC offset when converting them back to local time. This can lead to incorrect fields being displayed for the created
    // https://stackoverflow.com/questions/68240368/typeorm-find-methods-returns-wrong-timestamp-time
    process.env.TZ = 'UTC'
}


const main = async (): Promise<void> => {
    console.log('[DEBUG] main() started')
    setupTimeZone()
    if (system.isApp()) {
        console.log('[DEBUG] system.isApp() is true. Skipping migration lock (Temporary Fix)...')
        // await distributedLock(system.globalLogger()).runExclusive({
        //     key: 'database-migration-lock',
        //     timeoutInSeconds: dayjs.duration(10, 'minutes').asSeconds(),
        //     fn: async () => {
                 console.log('[DEBUG] Initializing database...')
                 await initializeDatabase({ runMigrations: true })
                 console.log('[DEBUG] Database initialized.')
        //     },
        // })
        console.log('[DEBUG] DB init block finished.')
    }
    console.log('[DEBUG] calling setupServer()...')
    const app = await setupServer()
    console.log('[DEBUG] setupServer() finished.')

    process.on('SIGINT', async () => {
        await stop(app).catch((e) => system.globalLogger().error(e, '[Main#stop]'))
    })

    process.on('SIGTERM', async () => {
        await stop(app).catch((e) => system.globalLogger().error(e, '[Main#stop]'))
    })

    console.log('[DEBUG] calling start(app)...')
    await start(app)
    console.log('[DEBUG] start(app) returned (server should be listening).')
}

main().catch((e) => {
    console.error('[Main#main] Fatal startup error:', e)
    try {
        system.globalLogger().error(e, '[Main#main]')
    } catch (loggerError) {
        console.error('[Main#main] Failed to initialize logger:', loggerError)
    }
    process.exit(1)
})

