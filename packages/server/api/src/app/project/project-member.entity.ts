import { EntitySchema } from 'typeorm'
import {
    ApId,
    BaseModelSchema,
    ProjectMember,
    ProjectMemberRole,
} from '@activepieces/shared'
import { BaseColumnSchemaPart } from '../database/database-common'

export type ProjectMemberSchema = ProjectMember

export const ProjectMemberEntity = new EntitySchema<ProjectMemberSchema>({
    name: 'project_member',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: {
            type: String,
            nullable: false,
        },
        userId: {
            type: String,
            nullable: false,
        },
        role: {
            type: String,
            nullable: false,
        },
        invitedBy: {
            type: String,
            nullable: true,
        },
    },
    indices: [
        {
            name: 'idx_project_member_project_id',
            columns: ['projectId'],
        },
        {
            name: 'idx_project_member_user_id',
            columns: ['userId'],
        },
        {
            // Ensure one user can only be added once per project
            name: 'idx_project_member_unique',
            columns: ['projectId', 'userId'],
            unique: true,
        },
    ],
})
