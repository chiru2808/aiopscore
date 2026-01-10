import { AppSystemProp } from '@activepieces/server-shared'
import { ApEdition } from '@activepieces/shared'
import { EntitySchemaColumnOptions } from 'typeorm'
import { DatabaseType, system } from '../helper/system/system'

const databaseType = DatabaseType.POSTGRES

export const JSON_COLUMN_TYPE = 'json'
export const JSONB_COLUMN_TYPE = 'jsonb'
export const BLOB_COLUMN_TYPE = 'bytea'
export const ARRAY_COLUMN_TYPE = 'text'
export const TIMESTAMP_COLUMN_TYPE = 'timestamp with time zone'
export const COLLATION = 'en_natural'

export function isPostgres(): boolean {
    return true
}

export const ApIdSchema = {
    type: String,
    length: 21,
} as EntitySchemaColumnOptions

export const BaseColumnSchemaPart = {
    id: {
        ...ApIdSchema,
        primary: true,
    } as EntitySchemaColumnOptions,
    created: {
        name: 'created',
        type: TIMESTAMP_COLUMN_TYPE,
        createDate: true,
    } as EntitySchemaColumnOptions,
    updated: {
        name: 'updated',
        type: TIMESTAMP_COLUMN_TYPE,
        updateDate: true,
    } as EntitySchemaColumnOptions,
}

export function isNotOneOfTheseEditions(editions: ApEdition[]): boolean {
    return !editions.includes(system.getEdition())
}