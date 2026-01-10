import {
    ActivepiecesError,
    ApEdition,
    ApId,
    assertNotNullOrUndefined,
    EndpointScope,
    ErrorCode,
    PlatformWithoutSensitiveData,
    PrincipalType,
    SERVICE_KEY_SECURITY_OPENAPI,
    UpdatePlatformRequestBody,
} from '@activepieces/shared'
import {
    FastifyPluginAsyncTypebox,
    Type,
} from '@fastify/type-provider-typebox'
import { StatusCodes } from 'http-status-codes'
import { userIdentityRepository } from '../authentication/user-identity/user-identity-service'
import { transaction } from '../core/db/transaction'

import { flowService } from '../flows/flow/flow.service'
import { system } from '../helper/system/system'
import { projectRepo } from '../project/project-service'
import { userRepo, userService } from '../user/user-service'
import { platformRepo, platformService } from './platform.service'

// Authorization stubs for Community Edition
const platformMustBeOwnedByCurrentUser = async () => { /* No-op in CE */ }
const platformToEditMustBeOwnedByCurrentUser = async () => { /* No-op in CE */ }

const edition = system.getEdition()
export const platformController: FastifyPluginAsyncTypebox = async (app) => {
    app.post('/:id', UpdatePlatformRequest, async (req, res) => {
        platformMustBeOwnedByCurrentUser()
        platformToEditMustBeOwnedByCurrentUser()
        // SMTP validation not available in Community Edition

        await platformService.update({
            id: req.params.id,
            ...req.body,
        })
        return platformService.getOneWithPlanAndUsageOrThrow(req.params.id)
    })

    app.get('/:id', GetPlatformRequest, async (req) => {
        if (req.principal.platform.id !== req.params.id) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'You are not authorized to access this platform',
                },
            })
        }
        return platformService.getOneWithPlanAndUsageOrThrow(req.principal.platform.id)
    })


}

const UpdatePlatformRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
        scope: EndpointScope.PLATFORM,
    },
    schema: {
        body: UpdatePlatformRequestBody,
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: PlatformWithoutSensitiveData,
        },
    },
}


const GetPlatformRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] as const,
        scope: EndpointScope.PLATFORM,
    },
    schema: {
        tags: ['platforms'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Get a platform by id',
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: PlatformWithoutSensitiveData,
        },
    },
}

const DeletePlatformRequest = {
    config: {
        allowedPrincipals: [PrincipalType.USER] as const,
        scope: EndpointScope.PLATFORM,
    },
    schema: {
        params: Type.Object({
            id: ApId,
        }),
    },
}