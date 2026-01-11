import { ApId, KnowledgeBase, ProjectId } from '@activepieces/shared'
import { EntitySchema } from 'typeorm'
import {
    ApIdSchema,
    BaseColumnSchemaPart,
    JSONB_COLUMN_TYPE,
} from '../database/database-common'

export type KnowledgeBaseSchema = KnowledgeBase

export const KnowledgeBaseEntity = new EntitySchema<KnowledgeBaseSchema>({
    name: 'knowledge_base',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: ApIdSchema,
        displayName: {
            type: String,
        },
        description: {
            type: String,
            nullable: true, 
        },
        type: {
            type: String,
        },
        status: {
            type: String,
        },
        metadata: {
            type: JSONB_COLUMN_TYPE,
            nullable: true,
        },
    },
    indices: [
        {
            name: 'idx_kb_project_id',
            columns: ['projectId'],
            unique: false,
        },
    ],
})
