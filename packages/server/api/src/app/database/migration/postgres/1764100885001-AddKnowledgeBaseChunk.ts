import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddKnowledgeBaseChunk1764100885001 implements MigrationInterface {
    name = 'AddKnowledgeBaseChunk1764100885001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Try to enable vector extension. May fail if not superuser, but required for vector type.
        try {
            await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`)
        } catch (e) {
            console.warn('Failed to enable vector extension, proceeding without it. Vector column might fail.', e)
        }

        await queryRunner.query(`
            CREATE TABLE "knowledge_base_chunk" (
                "id" character varying(21) NOT NULL,
                "knowledgeBaseId" character varying(21) NOT NULL,
                "content" text NOT NULL,
                "embedding" vector(1536),
                CONSTRAINT "PK_kb_chunk_id" PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_kb_chunk_kb_id" ON "knowledge_base_chunk" ("knowledgeBaseId")
        `)

        await queryRunner.query(`
            ALTER TABLE "knowledge_base_chunk"
            ADD CONSTRAINT "fk_kb_chunk_kb_id" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_base"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "knowledge_base_chunk" DROP CONSTRAINT "fk_kb_chunk_kb_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_kb_chunk_kb_id"
        `)
        await queryRunner.query(`
            DROP TABLE "knowledge_base_chunk"
        `)
    }
}
