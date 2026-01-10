import { BaseModel } from "../../common/base-model"

export type ApiKey = BaseModel<string> & {
    id: string
    projectId: string
    platformId: string
    displayName: string
    truncatedValue: string
    hashedValue: string
}
