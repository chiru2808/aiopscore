import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProjectMemberTableSqlite1764100000000 implements MigrationInterface {
    name = 'CreateProjectMemberTableSqlite1764100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "project_member" (
                "id" varchar PRIMARY KEY NOT NULL,
                "created" datetime NOT NULL DEFAULT (datetime('now')),
                "updated" datetime NOT NULL DEFAULT (datetime('now')),
                "projectId" varchar NOT NULL,
                "userId" varchar NOT NULL,
                "role" varchar NOT NULL,
                "invitedBy" varchar
            )`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_project_member_project_id" ON "project_member" ("projectId")`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_project_member_user_id" ON "project_member" ("userId")`
        )
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_member_unique" ON "project_member" ("projectId", "userId")`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "project_member"`)
    }
}
