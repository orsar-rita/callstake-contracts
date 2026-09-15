import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A CallStake account. Identity is the Stellar wallet address itself —
 * there is no separate password, because every write this backend relays
 * (staking, signal submission, voting) is already gated on-chain by that
 * same address. Auth proves control of it; it doesn't grant anything the
 * chain doesn't already require.
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'wallet_address', type: 'varchar', length: 56 })
  walletAddress!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 64, nullable: true })
  displayName!: string | null;

  @Column({ name: 'bio', type: 'varchar', length: 280, nullable: true })
  bio!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
