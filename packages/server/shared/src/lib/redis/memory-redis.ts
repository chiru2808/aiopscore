import Redis from 'ioredis'
// import { RedisMemoryServer } from 'redis-memory-server'

// let redisMemoryServer: RedisMemoryServer | null = null

export async function createMemoryRedisConnection(): Promise<Redis> {
    // Fallback to default localhost Redis instead of memory server
    return new Redis({
        maxRetriesPerRequest: null,
        host: 'localhost',
        port: 6379,
    })
    // const memoryServer = getOrCreateRedisMemoryServer()
    // const host = await memoryServer.getHost()
    // const port = await memoryServer.getPort()
    // const client = new Redis({
    //     maxRetriesPerRequest: null,
    //     host,
    //     port,
    // })
    // return client
}

// function getOrCreateRedisMemoryServer(): RedisMemoryServer {
//     if (redisMemoryServer) {
//         return redisMemoryServer
//     }
//     redisMemoryServer = new RedisMemoryServer()
//     return redisMemoryServer
// }
