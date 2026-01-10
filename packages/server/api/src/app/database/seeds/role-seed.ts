
import { DefaultProjectRole, ProjectRole, RoleType } from '@activepieces/shared'
import { repoFactory } from '../../core/db/repo-factory'

import { system } from '../../helper/system/system'
import { DataSeed } from './data-seed'

// Role seeding disabled in Community Edition - using basic permission model
// const projectMemberRoleRepo = repoFactory(ProjectRoleEntity)

// DO NOT CHANGE THESE IDS OR SHUFFLE THEM
const roleIds: Record<DefaultProjectRole, string> = {
    [DefaultProjectRole.ADMIN]: '461ueYHzMykyk5dIL8HzQ',
    [DefaultProjectRole.EDITOR]: 'sjWe85TwaFYxyhn2AgOha', 
    [DefaultProjectRole.OPERATOR]: '3Wl9IAw5aM0HLafHgMYkb',
    [DefaultProjectRole.VIEWER]: 'aJVBSSJ3YqZ7r1laFjM0a',
}

export const rolesSeed: DataSeed = {
    run: async () => {
        // Role seeding is disabled in Community Edition
        // Default permissions are managed through the basic permission model
    },
}