import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A secondary Stellar address a user has proven control of and attached to
 * their primary account (the account itself is still keyed by the address
 * used to log in — see User.walletAddress). Lets one person track a
 * cold-storage or multisig-cosigner address alongside their hot wallet.
 */
@Entity({ name: 'linked_wallets' })
export class LinkedWallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 56 })
  address!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
