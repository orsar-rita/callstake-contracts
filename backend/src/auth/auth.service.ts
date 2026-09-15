import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { User } from '../users/entities/user.entity';
import { ChallengeStoreService } from './challenge-store.service';
import { JwtPayload } from './jwt-payload.interface';

export interface LoginResult {
  accessToken: string;
  user: { id: string; walletAddress: string; displayName: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly challenges: ChallengeStoreService,
    private readonly jwtService: JwtService,
  ) {}

  async createChallenge(walletAddress: string) {
    return this.challenges.issue(walletAddress);
  }

  async verifyAndLogin(walletAddress: string, signatureBase64: string): Promise<LoginResult> {
    const nonce = await this.challenges.consume(walletAddress);
    if (!nonce) {
      throw new UnauthorizedException(
        'No pending login challenge for this address — request one first',
      );
    }

    if (!this.verifySignature(walletAddress, nonce, signatureBase64)) {
      throw new UnauthorizedException('Signature does not match the issued challenge');
    }

    const user = await this.findOrCreateUser(walletAddress);
    const accessToken = this.issueToken(user);

    return {
      accessToken,
      user: { id: user.id, walletAddress: user.walletAddress, displayName: user.displayName },
    };
  }

  /** Broken out so it can be unit tested against real Stellar keypairs without touching Redis/DB. */
  verifySignature(walletAddress: string, nonce: string, signatureBase64: string): boolean {
    if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
      return false;
    }
    try {
      const keypair = Keypair.fromPublicKey(walletAddress);
      const signature = Buffer.from(signatureBase64, 'base64');
      return keypair.verify(Buffer.from(nonce, 'utf8'), signature);
    } catch {
      // Malformed base64, wrong signature length, etc. — all just "not valid".
      return false;
    }
  }

  private async findOrCreateUser(walletAddress: string): Promise<User> {
    const existing = await this.users.findOne({ where: { walletAddress } });
    if (existing) {
      return existing;
    }
    return this.users.save(this.users.create({ walletAddress }));
  }

  private issueToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, walletAddress: user.walletAddress };
    return this.jwtService.sign(payload);
  }
}
