import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Keypair } from '@stellar/stellar-sdk';
import { AuthService } from './auth.service';
import { ChallengeStoreService } from './challenge-store.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  describe('verifySignature', () => {
    it('accepts a signature genuinely produced by the address private key', () => {
      const keypair = Keypair.random();
      const service = new AuthService({} as any, {} as any, {} as any);
      const nonce = 'abc123-nonce';
      const signature = keypair.sign(Buffer.from(nonce, 'utf8')).toString('base64');

      expect(service.verifySignature(keypair.publicKey(), nonce, signature)).toBe(true);
    });

    it('rejects a signature produced by a different keypair', () => {
      const owner = Keypair.random();
      const impostor = Keypair.random();
      const service = new AuthService({} as any, {} as any, {} as any);
      const nonce = 'abc123-nonce';
      const signature = impostor.sign(Buffer.from(nonce, 'utf8')).toString('base64');

      expect(service.verifySignature(owner.publicKey(), nonce, signature)).toBe(false);
    });

    it('rejects a signature over a different nonce (no replay across challenges)', () => {
      const keypair = Keypair.random();
      const service = new AuthService({} as any, {} as any, {} as any);
      const signature = keypair.sign(Buffer.from('nonce-a', 'utf8')).toString('base64');

      expect(service.verifySignature(keypair.publicKey(), 'nonce-b', signature)).toBe(false);
    });

    it('rejects a malformed address rather than throwing', () => {
      const service = new AuthService({} as any, {} as any, {} as any);
      expect(service.verifySignature('not-a-real-address', 'nonce', 'AA==')).toBe(false);
    });
  });

  describe('verifyAndLogin', () => {
    function makeService() {
      const usersRepo = {
        findOne: jest.fn(),
        create: jest.fn((data) => data),
        save: jest.fn((data) => ({ id: 'user-1', displayName: null, ...data })),
      };
      const challenges = {
        consume: jest.fn(),
      } as unknown as ChallengeStoreService;
      const jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
      const service = new AuthService(usersRepo as any, challenges, jwtService);
      return { service, usersRepo, challenges, jwtService };
    }

    it('rejects when there is no pending challenge', async () => {
      const { service, challenges } = makeService();
      (challenges.consume as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyAndLogin(Keypair.random().publicKey(), 'AA==')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an invalid signature and does not create a user', async () => {
      const { service, challenges, usersRepo } = makeService();
      (challenges.consume as jest.Mock).mockResolvedValue('the-nonce');

      await expect(
        service.verifyAndLogin(Keypair.random().publicKey(), Buffer.from('garbage').toString('base64')),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('creates a new user on first successful login and issues a token', async () => {
      const { service, challenges, usersRepo, jwtService } = makeService();
      const keypair = Keypair.random();
      const nonce = 'the-nonce';
      (challenges.consume as jest.Mock).mockResolvedValue(nonce);
      usersRepo.findOne.mockResolvedValue(null);
      const signature = keypair.sign(Buffer.from(nonce, 'utf8')).toString('base64');

      const result = await service.verifyAndLogin(keypair.publicKey(), signature);

      expect(usersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ walletAddress: keypair.publicKey() }),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ walletAddress: keypair.publicKey() }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('reuses the existing user on a repeat login instead of creating a duplicate', async () => {
      const { service, challenges, usersRepo } = makeService();
      const keypair = Keypair.random();
      const nonce = 'the-nonce';
      const existingUser: User = {
        id: 'existing-id',
        walletAddress: keypair.publicKey(),
        displayName: 'Trader',
        bio: null,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (challenges.consume as jest.Mock).mockResolvedValue(nonce);
      usersRepo.findOne.mockResolvedValue(existingUser);
      const signature = keypair.sign(Buffer.from(nonce, 'utf8')).toString('base64');

      const result = await service.verifyAndLogin(keypair.publicKey(), signature);

      expect(usersRepo.save).not.toHaveBeenCalled();
      expect(result.user.id).toBe('existing-id');
      expect(result.user.displayName).toBe('Trader');
    });
  });
});
