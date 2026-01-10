import { ActivepiecesError, apId, ErrorCode, isNil, UserIdentity } from '@activepieces/shared'
import { EntityManager } from 'typeorm'
import { FastifyBaseLogger } from 'fastify'
import { nanoid } from 'nanoid'
import { repoFactory } from '../../core/db/repo-factory'
import { passwordHasher } from '../lib/password-hasher'
import { UserIdentityEntity } from './user-identity-entity'

export const userIdentityRepository = repoFactory(UserIdentityEntity)

export const userIdentityService = (log: FastifyBaseLogger) => ({
    async create(params: Pick<UserIdentity, 'email' | 'password' | 'firstName' | 'lastName' | 'trackEvents' | 'newsLetter' | 'provider' | 'verified'>, entityManager?: EntityManager): Promise<UserIdentity> {
        log.info({
            email: params.email,
        }, 'Creating user identity')

        const cleanedEmail = params.email.toLowerCase().trim()
        const hashedPassword = await passwordHasher.hash(params.password)
        const userByEmail = await userIdentityRepository(entityManager).findOne({ where: { email: cleanedEmail } })
        if (userByEmail) {
            throw new ActivepiecesError({
                code: ErrorCode.EXISTING_USER,
                params: {
                    email: cleanedEmail,
                    platformId: null,
                },
            })
        }
        const newUserIdentity: UserIdentity = {
            firstName: params.firstName,
            lastName: params.lastName,
            provider: params.provider,
            email: cleanedEmail,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            verified: params.verified,
            id: apId(),
            password: hashedPassword,
            trackEvents: params.trackEvents,
            newsLetter: params.newsLetter,
            tokenVersion: nanoid(),
        }
        const identity = await userIdentityRepository(entityManager).save(newUserIdentity)
        return identity
    },
    async verifyIdentityPassword(params: VerifyIdentityPasswordParams): Promise<UserIdentity> {
        const userIdentity = await getIdentityByEmail(params.email)
        if (isNil(userIdentity)) {
            throw new ActivepiecesError({
                code: ErrorCode.INVALID_CREDENTIALS,
                params: null,
            })
        }
        if (!userIdentity.verified) {
            throw new ActivepiecesError({
                code: ErrorCode.EMAIL_IS_NOT_VERIFIED,
                params: {
                    email: userIdentity.email,
                },
            })
        }

        const passwordMatches = await passwordHasher.compare(params.password, userIdentity.password)
        if (!passwordMatches) {
            throw new ActivepiecesError({
                code: ErrorCode.INVALID_CREDENTIALS,
                params: null,
            })
        }
        return userIdentity
    },
    async getIdentityByEmail(email: string): Promise<UserIdentity | null> {
        const cleanedEmail = email.toLowerCase().trim()
        return userIdentityRepository().findOneBy({ email: cleanedEmail })
    },
    async getOneOrFail(params: GetOneOrFailParams): Promise<UserIdentity> {
        const userIdentity = await userIdentityRepository().findOneByOrFail({ id: params.id })
        return userIdentity
    },
    async getBasicInformation(id: string): Promise<Pick<UserIdentity, 'email' | 'firstName' | 'lastName' | 'trackEvents' | 'newsLetter'>> {
        const user = await userIdentityRepository().findOneByOrFail({ id })
        return {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            trackEvents: user.trackEvents,
            newsLetter: user.newsLetter,
        }
    },
    async updatePassword(params: UpdatePasswordParams): Promise<void> {
        const hashedPassword = await passwordHasher.hash(params.newPassword)
        await userIdentityRepository().update(params.id, {
            password: hashedPassword,
            tokenVersion: nanoid(),
        })
    },
    async verify(id: string): Promise<UserIdentity> {
        const user = await userIdentityRepository().findOneByOrFail({ id })
        if (user.verified) {
            throw new ActivepiecesError({
                code: ErrorCode.AUTHORIZATION,
                params: {
                    message: 'User is already verified',
                },
            })
        }
        return userIdentityRepository().save({
            ...user,
            verified: true,
        })
    },

    async update(params: { id: string, password?: string, verified?: boolean, firstName?: string, lastName?: string }): Promise<UserIdentity> {
        const updateData: Partial<UserIdentity> = {}
        if (params.password) {
            updateData.password = await passwordHasher.hash(params.password)
            updateData.tokenVersion = nanoid()
        }
        if (params.verified !== undefined) {
             updateData.verified = params.verified
        }
        if (params.firstName) updateData.firstName = params.firstName
        if (params.lastName) updateData.lastName = params.lastName
        
        await userIdentityRepository().update(params.id, {
            ...updateData,
            updated: new Date().toISOString(),
        })
        return userIdentityRepository().findOneByOrFail({ id: params.id })
    },
})


async function getIdentityByEmail(email: string): Promise<UserIdentity | null> {
    const cleanedEmail = email.toLowerCase().trim()
    return userIdentityRepository().findOneBy({ email: cleanedEmail })
}

type GetOneOrFailParams = {
    id: string
}

type UpdatePasswordParams = {
    id: string
    newPassword: string
}

type VerifyIdentityPasswordParams = {
    email: string
    password: string
}
