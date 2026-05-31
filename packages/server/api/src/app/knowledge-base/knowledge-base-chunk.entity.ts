import { EntitySchema } from 'typeorm'
import { ApIdSchema } from '../database/database-common'

export interface KnowledgeBaseChunk {
    id: string
    knowledgeBaseId: string
    content: string
    embedding: number[] | null
}

export const KnowledgeBaseChunkEntity = new EntitySchema<KnowledgeBaseChunk>({
    name: 'knowledge_base_chunk',
    columns: {
        id: {
            ...ApIdSchema,
            primary: true,
        },
        knowledgeBaseId: {
            ...ApIdSchema,
        },
        content: {
            type: String,
        },
        embedding: {
            type: 'simple-array', // TypeORM doesn't support vector type natively in schema without custom type, using simple-array or string for basic mapping, but raw generic 'vector' is specific. 
            // We will use 'float' array for TS, but DB column is vector. TypeORM might cast it specific way.
            // Actually, for pgvector in TypeORM, we often use 'varchar' and cast, or a custom transformer. 
            // For now, let's treat it as simple-array for read/write if compatible, or just skip mapping it fully if we use raw queries for vector search.
            nullable: true,
            array: true, 
        },
    },
    indices: [
        {
            name: 'idx_kb_chunk_kb_id',
            columns: ['knowledgeBaseId'],
            unique: false,
        },
    ],
})
