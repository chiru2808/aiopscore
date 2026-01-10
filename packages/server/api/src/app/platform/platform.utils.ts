import { ApEdition, isNil, PlatformId, PlatformWithoutSensitiveData, PrincipalType } from '@activepieces/shared'
import { FastifyRequest } from 'fastify'
import { system } from '../helper/system/system'
import { platformService } from './platform.service'

export const platformUtils = {
    async getPlatformIdForRequest(req: FastifyRequest): Promise<PlatformId | null> {
        if (req.principal.type !== PrincipalType.UNKNOWN && req.principal.type !== PrincipalType.WORKER) {
            return req.principal.platform.id
        }
        const platformIdFromHostName = await getPlatformIdForHostname(req.headers.host as string)
        if (!isNil(platformIdFromHostName)) {
            return platformIdFromHostName
        }
        if (system.getEdition() === ApEdition.CLOUD) {
            return null
        }
        // MULTI-TENANT: Return null for unauthenticated sign-ups
        // This triggers automatic platform creation in authentication.service.ts
        return null
    },
    isCustomerOnDedicatedDomain(platform: PlatformWithoutSensitiveData): boolean {
        const edition = system.getEdition()
        if (edition !== ApEdition.CLOUD) {
            return false
        }
        return platform.plan.customDomainsEnabled
    },
}

const getPlatformIdForHostname = async (
    hostname: string,
): Promise<string | null> => {
    if (system.getEdition() === ApEdition.COMMUNITY) {
        return null
    }
    // CE: No custom domain support
    return null
}
