import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialSchema1714332214897 implements MigrationInterface {
    name = 'CreateInitialSchema1714332214897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "username" varchar NOT NULL UNIQUE,
                "email" varchar NOT NULL UNIQUE,
                "password" varchar NOT NULL,
                "isAdmin" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "fullName" varchar,
                "institution" varchar,
                "profilePicture" varchar,
                "storageUsed" integer NOT NULL DEFAULT 0,
                "storageQuota" integer NOT NULL DEFAULT 1073741824,
                "role" varchar NOT NULL DEFAULT 'user',
                "lastLoginAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Tags table
        await queryRunner.query(`
            CREATE TABLE "tags" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "color" varchar,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdById" uuid NOT NULL,
                CONSTRAINT "fk_tags_users" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Projects table
        await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text,
                "isPublic" boolean NOT NULL DEFAULT false,
                "size" integer NOT NULL DEFAULT 0,
                "isArchived" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid NOT NULL,
                CONSTRAINT "fk_projects_users" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Project tags junction table
        await queryRunner.query(`
            CREATE TABLE "project_tags" (
                "projectId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                PRIMARY KEY ("projectId", "tagId"),
                CONSTRAINT "fk_project_tags_projects" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_project_tags_tags" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
            )
        `);

        // Molecular structures table
        await queryRunner.query(`
            CREATE TABLE "molecular_structures" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text,
                "format" varchar,
                "source" varchar,
                "externalId" varchar,
                "isPublic" boolean NOT NULL DEFAULT false,
                "thumbnailPath" varchar,
                "size" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid NOT NULL,
                "projectId" uuid,
                CONSTRAINT "fk_structures_users" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_structures_projects" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL
            )
        `);

        // Structure tags junction table
        await queryRunner.query(`
            CREATE TABLE "structure_tags" (
                "structureId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                PRIMARY KEY ("structureId", "tagId"),
                CONSTRAINT "fk_structure_tags_structures" FOREIGN KEY ("structureId") REFERENCES "molecular_structures"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_structure_tags_tags" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
            )
        `);

        // Structure versions table
        await queryRunner.query(`
            CREATE TABLE "structure_versions" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "versionNumber" integer NOT NULL,
                "commitMessage" varchar,
                "changeDescription" text,
                "filePath" varchar NOT NULL,
                "size" integer NOT NULL DEFAULT 0,
                "format" varchar,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "structureId" uuid NOT NULL,
                "createdById" uuid NOT NULL,
                "metadata" json,
                CONSTRAINT "fk_structure_versions_structures" FOREIGN KEY ("structureId") REFERENCES "molecular_structures"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_structure_versions_users" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ChimeraX sessions table
        await queryRunner.query(`
            CREATE TABLE "chimerax_sessions" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text,
                "isPublic" boolean NOT NULL DEFAULT false,
                "size" integer NOT NULL DEFAULT 0,
                "thumbnailPath" varchar,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "lastAccessedAt" TIMESTAMP,
                "userId" uuid NOT NULL,
                "projectId" uuid,
                CONSTRAINT "fk_sessions_users" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_sessions_projects" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL
            )
        `);

        // Session versions table
        await queryRunner.query(`
            CREATE TABLE "session_versions" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "versionNumber" integer NOT NULL,
                "commitMessage" varchar,
                "changeDescription" text,
                "filePath" varchar NOT NULL,
                "size" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "sessionId" uuid NOT NULL,
                "createdById" uuid NOT NULL,
                "metadata" json,
                CONSTRAINT "fk_session_versions_sessions" FOREIGN KEY ("sessionId") REFERENCES "chimerax_sessions"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_session_versions_users" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Snapshots table
        await queryRunner.query(`
            CREATE TABLE "snapshots" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text,
                "imagePath" varchar NOT NULL,
                "imageFormat" varchar,
                "width" integer,
                "height" integer,
                "size" integer NOT NULL DEFAULT 0,
                "viewSettings" json,
                "styleSettings" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "sessionId" uuid NOT NULL,
                "createdById" uuid NOT NULL,
                CONSTRAINT "fk_snapshots_sessions" FOREIGN KEY ("sessionId") REFERENCES "chimerax_sessions"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_snapshots_users" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // User preferences table
        await queryRunner.query(`
            CREATE TABLE "user_preferences" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "category" varchar NOT NULL,
                "key" varchar NOT NULL,
                "value" json NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid NOT NULL,
                CONSTRAINT "fk_user_preferences_users" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_structures_user" ON "molecular_structures" ("userId")`);
        await queryRunner.query(`CREATE INDEX "idx_structures_project" ON "molecular_structures" ("projectId")`);
        await queryRunner.query(`CREATE INDEX "idx_structure_versions_structure" ON "structure_versions" ("structureId")`);
        await queryRunner.query(`CREATE INDEX "idx_sessions_user" ON "chimerax_sessions" ("userId")`);
        await queryRunner.query(`CREATE INDEX "idx_sessions_project" ON "chimerax_sessions" ("projectId")`);
        await queryRunner.query(`CREATE INDEX "idx_session_versions_session" ON "session_versions" ("sessionId")`);
        await queryRunner.query(`CREATE INDEX "idx_snapshots_session" ON "snapshots" ("sessionId")`);
        await queryRunner.query(`CREATE INDEX "idx_user_preferences_user" ON "user_preferences" ("userId")`);
        await queryRunner.query(`CREATE INDEX "idx_user_preferences_category" ON "user_preferences" ("category")`);
        await queryRunner.query(`CREATE INDEX "idx_tags_user" ON "tags" ("createdById")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_user_preferences_unique" ON "user_preferences" ("userId", "category", "key")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order to avoid foreign key constraints
        await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "snapshots" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "session_versions" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "chimerax_sessions" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "structure_versions" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "structure_tags" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "molecular_structures" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "project_tags" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tags" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    }
}