// CE: Enterprise Edition type stubs
// These types were originally in @activepieces/ee-shared
// Creating stubs here for Community Edition compatibility

import { Static, Type } from '@sinclair/typebox'

export enum OtpType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export const CreateOtpRequestBody = Type.Object({
  email: Type.String(),
  type: Type.Enum(OtpType),
})

export type CreateOtpRequestBody = Static<typeof CreateOtpRequestBody>

export enum GitBranchType {
  DEVELOPMENT = 'DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
}

// CE: Always return false for cloud plan checks (no cloud plans in CE)
export function isCloudPlanButNotEnterprise(plan: any): boolean {
  return false
}

// Embed SDK event names (moved from ee-embed-sdk)
export const ActivepiecesClientEventName = {
  CLIENT_BUILDER_HOME_BUTTON_CLICKED: 'CLIENT_BUILDER_HOME_BUTTON_CLICKED',
  CLIENT_INIT: 'CLIENT_INIT',
  CLIENT_ROUTE_CHANGED: 'CLIENT_ROUTE_CHANGED',
} as const

export const ActivepiecesVendorEventName = {
  VENDOR_INIT: 'VENDOR_INIT',
  VENDOR_ROUTE_CHANGED: 'VENDOR_ROUTE_CHANGED',
} as const

export const NEW_CONNECTION_QUERY_PARAMS = 'new-connection'

export enum GitPushOperationType {
  PUSH_EVERYTHING = 'PUSH_EVERYTHING',
  PUSH_SELECTED = 'PUSH_SELECTED',
}

export const PushEverythingGitRepoRequest = Type.Object({
  type: Type.Literal(GitPushOperationType.PUSH_EVERYTHING),
  commitMessage: Type.String(),
})

export type PushEverythingGitRepoRequest = Static<typeof PushEverythingGitRepoRequest>

export type PushGitRepoRequest = {
  type: GitPushOperationType
  commitMessage?: string
}
