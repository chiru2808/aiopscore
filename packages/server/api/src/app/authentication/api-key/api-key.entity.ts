import { EntitySchema } from 'typeorm'
import {
    ApIdSchema,
    BaseColumnSchemaPart,
} from '../../database/database-common'
import { ApiKey } from '@activepieces/shared'

export type ApiKeySchema = ApiKey

export const ApiKeyEntity = new EntitySchema<ApiKeySchema>({
    name: 'api_key',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: {
            ...ApIdSchema,
            nullable: false,
        },
        displayName: {
            type: String,
            nullable: false,
        },
        truncatedValue: {
            type: String,
            nullable: false,
        },
        hashedValue: {
            type: String,
            nullable: false,
            select: false, // Do not return by default
        },
        platformId: {
            ...ApIdSchema,
            nullable: false,
        },
    },
    indices: [
        {
            name: 'REL_api_key_project_id',
            columns: ['projectId'],
        },
    ],
})
