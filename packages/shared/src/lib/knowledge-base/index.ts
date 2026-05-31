import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema } from '../common'

export enum KnowledgeBaseType {
    TEXT = 'TEXT',
    FILE = 'FILE',
    URL = 'URL',
}

export enum KnowledgeBaseStatus {
    SYNCED = 'SYNCED',
    SYNCING = 'SYNCING',
    FAILED = 'FAILED',
}

export const KnowledgeBase = Type.Object({
    ...BaseModelSchema,
    projectId: Type.String(),
    displayName: Type.String(),
    description: Type.Optional(Type.String()),
    type: Type.Enum(KnowledgeBaseType),
    status: Type.Enum(KnowledgeBaseStatus),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
})

export type KnowledgeBase = Static<typeof KnowledgeBase>

export const CreateKnowledgeBaseRequest = Type.Object({
    displayName: Type.String(),
    description: Type.Optional(Type.String()),
    type: Type.Enum(KnowledgeBaseType),
    content: Type.String(), // Text content or File ID or URL
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
})

export type CreateKnowledgeBaseRequest = Static<typeof CreateKnowledgeBaseRequest>
