import { AppSystemProp } from '@activepieces/server-shared'
import { ApEdition, isNil } from '@activepieces/shared'
import {
    ArrayContains,
    DataSource,
    EntitySchema,
    FindOperator,
    ObjectLiteral,
    Raw,
    SelectQueryBuilder,
} from 'typeorm'
import { AIProviderEntity } from '../ai/ai-provider-entity'
import { AIUsageEntity } from '../ai/ai-usage-entity'
import { AppConnectionEntity } from '../app-connection/app-connection.entity'
import { UserIdentityEntity } from '../authentication/user-identity/user-identity-entity'
import { FileEntity } from '../file/file.entity'
import { FlagEntity } from '../flags/flag.entity'
import { FlowEntity } from '../flows/flow/flow.entity'
import { FlowRunEntity } from '../flows/flow-run/flow-run-entity'
import { FlowVersionEntity } from '../flows/flow-version/flow-version-entity'
import { FolderEntity } from '../flows/folder/folder.entity'
import { DatabaseType, system } from '../helper/system/system'
import { McpRunEntity } from '../mcp/mcp-run/mcp-run.entity'
import { McpEntity } from '../mcp/mcp-server/mcp-entity'
import { McpToolEntity } from '../mcp/tool/mcp-tool.entity'
import { PieceMetadataEntity } from '../pieces/metadata/piece-metadata-entity'
import { PieceTagEntity } from '../pieces/tags/pieces/piece-tag.entity'
import { TagEntity } from '../pieces/tags/tag-entity'
import { PlatformEntity } from '../platform/platform.entity'
import { ProjectEntity } from '../project/project-entity'
import { StoreEntryEntity } from '../store-entry/store-entry-entity'
import { FieldEntity } from '../tables/field/field.entity'
import { CellEntity } from '../tables/record/cell.entity'
import { RecordEntity } from '../tables/record/record.entity'
import { TableWebhookEntity } from '../tables/table/table-webhook.entity'
import { TableEntity } from '../tables/table/table.entity'
import { TodoActivityEntity } from '../todos/activity/todos-activity.entity'
import { TodoEntity } from '../todos/todo.entity'
import { AppEventRoutingEntity } from '../trigger/app-event-routing/app-event-routing.entity'
import { TriggerEventEntity } from '../trigger/trigger-events/trigger-event.entity'
import { TriggerSourceEntity } from '../trigger/trigger-source/trigger-source-entity'
import { UserEntity } from '../user/user-entity'
import { UserInvitationEntity } from '../user-invitations/user-invitation.entity'
import { WorkerMachineEntity } from '../workers/machine/machine-entity'
import { ProjectMemberEntity } from '../project/project-member.entity'
import { ProjectPlanEntity } from '../billing/project-plan.entity'
import { ApiKeyEntity } from '../authentication/api-key/api-key.entity'
import { createPostgresDataSource } from './postgres-connection'

const databaseType = system.get(AppSystemProp.DB_TYPE)
function getEntities(): EntitySchema<unknown>[] {
    const edition = system.getEdition()

    const entities: EntitySchema[] = [
        TriggerEventEntity,
        AppEventRoutingEntity,
        FileEntity,
        FlagEntity,
        FlowEntity,
        FlowVersionEntity,
        FlowRunEntity,
        ProjectEntity,
        StoreEntryEntity,
        UserEntity,
        AppConnectionEntity,
        FolderEntity,
        PieceMetadataEntity,
        PlatformEntity,
        TagEntity,
        PieceTagEntity,

        UserInvitationEntity,
        WorkerMachineEntity,
        AIProviderEntity,

        TableEntity,
        FieldEntity,
        RecordEntity,
        CellEntity,
        TableWebhookEntity,
        UserIdentityEntity,
        TodoEntity,
        McpEntity,
        TodoActivityEntity,
        McpToolEntity,
        McpRunEntity,
        AIUsageEntity,
        TriggerSourceEntity,
        ProjectMemberEntity, // Added for team collaboration
        ProjectPlanEntity,
        ApiKeyEntity,
    ]


    switch (edition) {
        case ApEdition.CLOUD:
        case ApEdition.ENTERPRISE:
            // EE entities removed for CE
            throw new Error(`Unsupported edition: ${edition}`)
    }

    return entities
}

export const commonProperties = {
    subscribers: [],
    entities: getEntities(),
}

let _databaseConnection: DataSource | null = null

export const databaseConnection = () => {
    if (isNil(_databaseConnection)) {
        _databaseConnection = createPostgresDataSource()
    }
    return _databaseConnection
}

export function getDatabaseType(): DatabaseType {
    const dbType = system.getOrThrow<DatabaseType>(AppSystemProp.DB_TYPE)
    if (dbType !== DatabaseType.POSTGRES) {
        // Fallback or Force override for now since we successfully identified issue with SQLite
        // But strictly per user request, we want ONLY Postgres.
        // For now, let's assume we are fixing the code to ignore other types and force Postgres connection.
        return DatabaseType.POSTGRES
    }
    return dbType
}


export function AddAPArrayContainsToQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    columnName: string,
    values: string[],
): void {
     // Strictly Postgres implementation
    queryBuilder.andWhere(`${columnName} @> :values`, { values })
}

export function APArrayContains<T>(
    columnName: string,
    values: string[],
): Record<string, FindOperator<T>> {
    // Strictly Postgres implementation
    return {
        [columnName]: ArrayContains(values),
    }
}

// Uncomment the below line when running `nx db-migration server-api --name=<MIGRATION_NAME>` and recomment it after the migration is generated
// export const exportedConnection = databaseConnection()
