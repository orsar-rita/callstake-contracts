import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractRegistryService } from '../../config/contract-registry.service';
import { SorobanClientService } from '../../stellar/soroban-client.service';
import { requireSimulationAccount } from '../../stellar/simulation-account';
import { CONTRACT_SLOTS } from '../contracts.constants';

@Injectable()
export class StakeVaultService {
  constructor(
    private readonly soroban: SorobanClientService,
    private readonly registry: ContractRegistryService,
    private readonly configService: ConfigService,
  ) {}

  private address(): string {
    return this.registry.requireAddress(CONTRACT_SLOTS.STAKE_VAULT);
  }

  private simAccount(): string {
    return requireSimulationAccount(this.configService);
  }

  async getStake(staker: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_stake',
      [staker],
      this.simAccount(),
    );
    return result.value;
  }

  async getVotingPower(staker: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_voting_power',
      [staker],
      this.simAccount(),
    );
    return result.value;
  }

  async getMinimumStake() {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_minimum_stake',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  async getWithdrawalUnlockTime(staker: string) {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'get_withdrawal_unlock_time',
      [staker],
      this.simAccount(),
    );
    return result.value;
  }

  async isPaused() {
    const result = await this.soroban.callReadOnly(
      this.address(),
      'is_paused',
      [],
      this.simAccount(),
    );
    return result.value;
  }

  /** Builds the transaction depositing `amount` (stroops-equivalent i128) of stake for `staker`. */
  async buildDepositStake(staker: string, amount: bigint) {
    return this.soroban.buildInvocation(this.address(), 'deposit_stake', [staker, amount], staker);
  }

  /** Builds the transaction starting the withdrawal cooldown for `staker`'s full stake. */
  async buildRequestWithdrawal(staker: string) {
    return this.soroban.buildInvocation(this.address(), 'request_withdrawal', [staker], staker);
  }

  /** Builds the transaction finalizing a withdrawal once its cooldown has elapsed. */
  async buildWithdrawStake(staker: string) {
    return this.soroban.buildInvocation(this.address(), 'withdraw_stake', [staker], staker);
  }

  async submitSignedTransaction(signedXdr: string) {
    return this.soroban.submitSignedTransaction(signedXdr);
  }
}
