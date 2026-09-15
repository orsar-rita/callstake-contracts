import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** A raw contract event synced from Soroban RPC, kept for fast local reads instead of re-querying RPC per request. */
@Entity({ name: 'indexed_events' })
@Index(['contractSlot', 'ledger'])
export class IndexedEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'contract_slot', type: 'varchar', length: 64 })
  contractSlot!: string;

  @Column({ name: 'ledger', type: 'bigint' })
  ledger!: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 64, nullable: true })
  txHash!: string | null;

  @Column({ name: 'topics', type: 'jsonb' })
  topics!: unknown[];

  @Column({ name: 'data', type: 'jsonb' })
  data!: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
