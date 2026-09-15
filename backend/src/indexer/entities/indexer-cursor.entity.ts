import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** One row per watched contract slot, tracking the last ledger successfully indexed. */
@Entity({ name: 'indexer_cursors' })
export class IndexerCursor {
  @PrimaryColumn({ name: 'contract_slot', type: 'varchar', length: 64 })
  contractSlot!: string;

  @Column({ name: 'last_ledger', type: 'bigint' })
  lastLedger!: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
