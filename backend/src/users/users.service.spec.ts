import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { UsersService } from './users.service';

function makeService(userOverrides: Partial<{ id: string; walletAddress: string }> = {}) {
  const user = { id: 'user-1', walletAddress: Keypair.random().publicKey(), displayName: null, bio: null, createdAt: new Date(), ...userOverrides };
  const usersRepo = {
    findOne: jest.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id === user.id || where.walletAddress === user.walletAddress) {
        return user;
      }
      return null;
    }),
    save: jest.fn().mockImplementation(async (u) => u),
  };
  const linkedWalletsRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((data) => data),
    save: jest.fn().mockImplementation(async (w) => w),
  };
  const challenges = {
    issue: jest.fn().mockResolvedValue({ nonce: 'n', expiresInSeconds: 300 }),
    consume: jest.fn(),
  };
  const authService = {
    verifySignature: jest.fn(),
  };
  const service = new UsersService(usersRepo as any, linkedWalletsRepo as any, challenges as any, authService as any);
  return { service, usersRepo, linkedWalletsRepo, challenges, authService, user };
}

describe('UsersService', () => {
  it('getProfile throws NotFoundException for a missing user', async () => {
    const { service, usersRepo } = makeService();
    usersRepo.findOne.mockResolvedValue(null);
    await expect(service.getProfile('nope')).rejects.toThrow(NotFoundException);
  });

  it('updateProfile only touches fields that were provided', async () => {
    const { service, usersRepo, user } = makeService();
    await service.updateProfile(user.id, { displayName: 'Nova' });
    expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Nova' }));
  });

  it('createLinkChallenge rejects linking the account primary address to itself', async () => {
    const { service, user } = makeService();
    await expect(service.createLinkChallenge(user.id, user.walletAddress)).rejects.toThrow(BadRequestException);
  });

  it('verifyLinkWallet rejects when there is no pending challenge', async () => {
    const { service, challenges, user } = makeService();
    challenges.consume.mockResolvedValue(null);
    await expect(service.verifyLinkWallet(user.id, 'GOTHER', 'AA==')).rejects.toThrow(UnauthorizedException);
  });

  it('verifyLinkWallet rejects an invalid signature', async () => {
    const { service, challenges, authService, user } = makeService();
    challenges.consume.mockResolvedValue('the-nonce');
    authService.verifySignature.mockReturnValue(false);
    await expect(service.verifyLinkWallet(user.id, 'GOTHER', 'AA==')).rejects.toThrow(UnauthorizedException);
  });

  it('verifyLinkWallet rejects an address already linked to another account', async () => {
    const { service, challenges, authService, linkedWalletsRepo, user } = makeService();
    challenges.consume.mockResolvedValue('the-nonce');
    authService.verifySignature.mockReturnValue(true);
    linkedWalletsRepo.findOne.mockResolvedValue({ id: 'existing-link' });
    await expect(service.verifyLinkWallet(user.id, 'GOTHER', 'AA==')).rejects.toThrow(ConflictException);
  });

  it('verifyLinkWallet links the address on a valid, unclaimed signature', async () => {
    const { service, challenges, authService, linkedWalletsRepo, user } = makeService();
    challenges.consume.mockResolvedValue('the-nonce');
    authService.verifySignature.mockReturnValue(true);

    await service.verifyLinkWallet(user.id, 'GOTHER', 'AA==');

    expect(linkedWalletsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, address: 'GOTHER' }),
    );
  });
});
