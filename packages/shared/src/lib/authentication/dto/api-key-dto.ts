import { Static, Type } from "@sinclair/typebox";
import { ApId } from "../../common/id-generator";

export const CreateApiKeyRequest = Type.Object({
    displayName: Type.String(),
});

export type CreateApiKeyRequest = Static<typeof CreateApiKeyRequest>;

export const CreateApiKeyResponse = Type.Object({
    id: ApId,
    displayName: Type.String(),
    truncatedValue: Type.String(),
    value: Type.String(),
});

export type CreateApiKeyResponse = Static<typeof CreateApiKeyResponse>;

export const ListApiKeyResponse = Type.Array(Type.Object({
    id: ApId,
    displayName: Type.String(),
    truncatedValue: Type.String(),
    created: Type.String(),
}));

export type ListApiKeyResponse = Static<typeof ListApiKeyResponse>;
