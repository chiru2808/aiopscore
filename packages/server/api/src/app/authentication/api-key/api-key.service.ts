import { ActivepiecesError, apId, ErrorCode, SeekPage } from '@activepieces/shared'
import { databaseConnection } from '../../database/database-connection'
import { ApiKeyEntity } from './api-key.entity'
import * as crypto from 'crypto'
import { ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from '@activepieces/shared'

const repo = databaseConnection().getRepository(ApiKeyEntity)

export const apiKeyService = {
    async create({ projectId, platformId, displayName }: { projectId: string; platformId: string; displayName: string }): Promise<CreateApiKeyResponse> {
        const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`
        const hashedValue = crypto.createHash('sha256').update(rawKey).digest('hex')
        const truncatedValue = `sk_...${rawKey.slice(-4)}`

        const apiKey = await repo.save({
            id: apId(),
            projectId,
            platformId,
            displayName,
            hashedValue,
            truncatedValue,
        })

        return {
            id: apiKey.id,
            displayName: apiKey.displayName,
            truncatedValue: apiKey.truncatedValue,
            value: rawKey,
        }
    },

    async list(projectId: string): Promise<ApiKey[]> {
        return repo.findBy({ projectId })
    },

    async delete(id: string, projectId: string): Promise<void> {
        const key = await repo.findOneBy({ id, projectId })
        if (!key) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    message: `ApiKey ${id} not found`,
                },
            })
        }
        await repo.delete({ id })
    },

    async getOneByValue(rawValue: string): Promise<ApiKey | null> {
        const hashedValue = crypto.createHash('sha256').update(rawValue).digest('hex')
        return repo.findOneBy({ hashedValue })
    }
}
