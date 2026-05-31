import { ApId, Cursor, KnowledgeBase, KnowledgeBaseType, ProjectId, SeekPage, KnowledgeBaseStatus, apId } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { buildPaginator } from '../helper/pagination/build-paginator'
import { paginationHelper } from '../helper/pagination/pagination-utils'
import { KnowledgeBaseEntity } from './knowledge-base.entity'
import { KnowledgeBaseChunkEntity } from './knowledge-base-chunk.entity'
import { createOpenAI } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import { aiProviderService } from '../ai/ai-provider-service'
import { projectService } from '../project/project-service'

export const knowledgeBaseRepo = repoFactory(KnowledgeBaseEntity)
export const knowledgeBaseChunkRepo = repoFactory(KnowledgeBaseChunkEntity)

export const knowledgeBaseService = (log: FastifyBaseLogger) => ({
    async create(params: CreateParams): Promise<KnowledgeBase> {
        const kb = await knowledgeBaseRepo().save({
            id: params.id,
            projectId: params.projectId,
            displayName: params.displayName,
            description: params.description,
            type: params.type,
            status: KnowledgeBaseStatus.SYNCING,
            metadata: params.metadata,
        })
        
        // Asynchronous ingestion
        this.ingest(kb, log).catch(e => {
            log.error(e, '[KnowledgeBaseService] Ingestion failed')
        })

        return kb
    },

    async ingest(kb: KnowledgeBase, log: FastifyBaseLogger): Promise<void> {
        try {
            log.info(`[KnowledgeBaseService] Starting ingestion for ${kb.id}`)
            
            // 1. Get Content
            const content = kb.metadata?.content as string || ''
            if (!content) {
                log.warn(`[KnowledgeBaseService] No content to ingest for ${kb.id}`)
                await knowledgeBaseRepo().update(kb.id, {
                    status: KnowledgeBaseStatus.SYNCED, // Or some other status for empty
                })
                return
            }

            // 2. Chunking
            const chunks = this.chunkText(content, 1000)
            log.info(`[KnowledgeBaseService] Created ${chunks.length} chunks`)

            // 3. Generate Embeddings
            const platformId = await projectService.getPlatformId(kb.projectId)
            // Ensure platformId is string. ProjectService returns string.
            
            const config = await aiProviderService.getConfig('openai', platformId)
            
            const openai = createOpenAI({
                apiKey: config.apiKey,
                baseURL: aiProviderService.getBaseUrl('openai', config),
            })
            
            const embeddings: number[][] = []
            const batchSize = 10
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize)
                const { embeddings: batchEmbeddings } = await embedMany({
                    model: openai.embedding('text-embedding-3-small'),
                    values: batch,
                })
                embeddings.push(...batchEmbeddings)
            }

            // 4. Save to DB
            for (let i = 0; i < chunks.length; i++) {
                await knowledgeBaseChunkRepo().save({
                    id: apId(),
                    knowledgeBaseId: kb.id,
                    content: chunks[i],
                    embedding: embeddings[i],
                })
            }

            // 5. Update Status
            await knowledgeBaseRepo().update(kb.id, {
                status: KnowledgeBaseStatus.SYNCED,
            })
            log.info(`[KnowledgeBaseService] Ingestion completed for ${kb.id}`)

        } catch (error) {
            log.error(error, `[KnowledgeBaseService] Ingestion failed for ${kb.id}`)
             await knowledgeBaseRepo().update(kb.id, {
                status: KnowledgeBaseStatus.FAILED,
            })
        }
    },

    chunkText(text: string, chunkSize: number): string[] {
        const chunks = []
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize))
        }
        return chunks
    },

    async list(params: ListParams): Promise<SeekPage<KnowledgeBase>> {
        const paginator = buildPaginator({
            entity: KnowledgeBaseEntity,
            query: {
                limit: params.limit,
                afterCursor: params.cursor ?? undefined,
                order: 'DESC',
            },
        })
        const query = knowledgeBaseRepo().createQueryBuilder('kb')
            .where('kb.projectId = :projectId', { projectId: params.projectId })

        const { data, cursor } = await paginator.paginate(query)
        return paginationHelper.createPage(data, cursor)
    },
})

type CreateParams = {
    id: ApId
    projectId: ProjectId
    displayName: string
    description?: string
    type: KnowledgeBaseType
    status: KnowledgeBaseStatus
    metadata?: Record<string, unknown>
}

type ListParams = {
    projectId: ProjectId
    cursor: Cursor | null
    limit: number
}
