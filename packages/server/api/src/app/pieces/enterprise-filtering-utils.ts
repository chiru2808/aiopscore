import { PieceMetadata } from '@activepieces/pieces-framework'

// CE stub for enterprise filtering utils
export const enterpriseFilteringUtils = {
    async isFiltered(params: { piece: PieceMetadata; projectId: string; platformId: string }): Promise<boolean> {
        // CE: Never filter pieces
        return false
    },

    filter(params: { pieces: PieceMetadata[]; includeHidden: boolean; platformId: string }): PieceMetadata[] {
        // CE: Return all pieces
        return params.pieces
    },
}
