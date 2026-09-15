import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import * as crypto from 'node:crypto';
import { REDIS_CLIENT } from '../redis/redis.module';

/** "login" and "link-wallet" get separate namespaces so a signature captured for one purpose can't be replayed as the other. */
export type ChallengePurpose = 'login' | 'link-wallet';

function challengeKey(purpose: ChallengePurpose, walletAddress: string): string {
  return `auth:challenge:${purpose}:${walletAddress}`;
}

/**
 * One-time nonces, Redis-backed so they expire on their own (TTL) and are
 * naturally shared across backend replicas — a nonce issued by one
 * instance can be verified by another.
 */
@Injectable()
export class ChallengeStoreService {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('auth.challengeTtlSeconds', 300);
  }

  async issue(
    walletAddress: string,
    purpose: ChallengePurpose = 'login',
  ): Promise<{ nonce: string; expiresInSeconds: number }> {
    const nonce = crypto.randomBytes(32).toString('base64url');
    await this.redis.set(challengeKey(purpose, walletAddress), nonce, 'EX', this.ttlSeconds);
    return { nonce, expiresInSeconds: this.ttlSeconds };
  }

  async peek(walletAddress: string, purpose: ChallengePurpose = 'login'): Promise<string | null> {
    return this.redis.get(challengeKey(purpose, walletAddress));
  }

  /** Consumes (deletes) the nonce so a captured signature can't be replayed against a second use. */
  async consume(
    walletAddress: string,
    purpose: ChallengePurpose = 'login',
  ): Promise<string | null> {
    const key = challengeKey(purpose, walletAddress);
    const nonce = await this.redis.get(key);
    if (nonce) {
      await this.redis.del(key);
    }
    return nonce;
  }
}
