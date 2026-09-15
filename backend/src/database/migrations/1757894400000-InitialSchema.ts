import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1757894400000 implements MigrationInterface {
  name = 'InitialSchema1757894400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto"
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "wallet_address" varchar(56) NOT NULL,
        "display_name" varchar(64),
        "bio" varchar(280),
        "is_admin" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_wallet_address" UNIQUE ("wallet_address")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "linked_wallets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "address" varchar(56) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_linked_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_linked_wallets_address" UNIQUE ("address"),
        CONSTRAINT "FK_linked_wallets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "indexed_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "contract_slot" varchar(64) NOT NULL,
        "ledger" bigint NOT NULL,
        "tx_hash" varchar(64),
        "topics" jsonb NOT NULL,
        "data" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_indexed_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_indexed_events_slot_ledger" ON "indexed_events" ("contract_slot", "ledger")
    `);

    await queryRunner.query(`
      CREATE TABLE "indexer_cursors" (
        "contract_slot" varchar(64) NOT NULL,
        "last_ledger" bigint NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_indexer_cursors" PRIMARY KEY ("contract_slot")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "indexer_cursors"`);
    await queryRunner.query(`DROP INDEX "IDX_indexed_events_slot_ledger"`);
    await queryRunner.query(`DROP TABLE "indexed_events"`);
    await queryRunner.query(`DROP TABLE "linked_wallets"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
