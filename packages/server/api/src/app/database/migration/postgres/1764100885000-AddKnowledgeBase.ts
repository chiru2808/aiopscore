import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddKnowledgeBase1764100885000 implements MigrationInterface {
    name = 'AddKnowledgeBase1764100885000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "knowledge_base" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "updated" TIMESTAMP NOT NULL DEFAULT now(),
                "projectId" character varying(21) NOT NULL,
                "displayName" character varying NOT NULL,
                "description" character varying,
                "type" character varying NOT NULL,
                "status" character varying NOT NULL,
                "metadata" jsonb,
                CONSTRAINT "PK_knowledge_base_id" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_kb_project_id" ON "knowledge_base" ("projectId")
        `)
        await queryRunner.query(`
            ALTER TABLE "knowledge_base"
            ADD CONSTRAINT "fk_kb_project_id" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "knowledge_base" DROP CONSTRAINT "fk_kb_project_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_kb_project_id"
        `)
        await queryRunner.query(`
            DROP TABLE "knowledge_base"
        `)
    }
}
