import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema, Nullable } from '../common'
import { ApId } from '../common/id-generator'
import { EmailType } from '../user/user'
import { UserWithMetaInformation } from '../user'

// Simple role system expanded for requested Operator role
export enum ProjectMemberRole {
    OWNER = 'OWNER',
    MEMBER = 'MEMBER',
    OPERATOR = 'OPERATOR',
}

// Legacy enum from EE - kept for compatibility
export enum DefaultProjectRole {
    ADMIN = 'Admin',
    EDITOR = 'Editor',
    OPERATOR = 'Operator',
    VIEWER = 'Viewer',
}

export const ProjectMember = Type.Object({
    ...BaseModelSchema,
    projectId: ApId,
    userId: ApId,
    role: Type.Enum(ProjectMemberRole),
    invitedBy: Nullable(ApId),
})

export type ProjectMember = Static<typeof ProjectMember>

export const ProjectMemberWithUser = Type.Object({
    ...ProjectMember.properties,
    user: UserWithMetaInformation,
})

export type ProjectMemberWithUser = Static<typeof ProjectMemberWithUser>

export const InviteProjectMemberRequest = Type.Object({
    email: EmailType,
    role: Type.Enum(ProjectMemberRole),
})

export type InviteProjectMemberRequest = Static<typeof InviteProjectMemberRequest>

export const UpdateProjectMemberRoleRequestBody = Type.Object({
    role: Type.Enum(ProjectMemberRole),
})

export type UpdateProjectMemberRoleRequestBody = Static<typeof UpdateProjectMemberRoleRequestBody>

export const ListProjectMembersRequestQuery = Type.Object({
    projectId: Type.Optional(ApId),
    cursor: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number()),
})

export type ListProjectMembersRequestQuery = Static<typeof ListProjectMembersRequestQuery>
