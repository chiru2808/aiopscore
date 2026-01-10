import { EntitySchema } from 'typeorm'
import {
    ApIdSchema,
    BaseColumnSchemaPart,
    TIMESTAMP_COLUMN_TYPE,
} from '../database/database-common'
import { ProjectPlan } from '@activepieces/shared'

export type ProjectPlanSchema = ProjectPlan

export const ProjectPlanEntity = new EntitySchema<ProjectPlanSchema>({
    name: 'project_plan',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: {
            ...ApIdSchema,
            nullable: false,
        },
        stripeCustomerId: {
            type: String,
            nullable: true,
        },
        stripeSubscriptionId: {
            type: String,
            nullable: true,
        },
        subscriptionStartDatetime: {
            type: TIMESTAMP_COLUMN_TYPE,
            nullable: false,
        },
        name: {
            type: String,
            nullable: false,
        },
    },
    indices: [
        {
            name: 'REL_4f52e89612966d95843e4158bb',
            columns: ['projectId'],
            unique: true,
        },
    ],
})
