import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function makeContext(userId?: string) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: userId ? { sub: userId } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  it('rejects an unauthenticated request', async () => {
    const users = { findOne: jest.fn() };
    const guard = new AdminGuard(users as any);
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(ForbiddenException);
  });

  it('rejects a non-admin user', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ isAdmin: false }) };
    const guard = new AdminGuard(users as any);
    await expect(guard.canActivate(makeContext('user-1'))).rejects.toThrow(ForbiddenException);
  });

  it('allows an admin user through', async () => {
    const users = { findOne: jest.fn().mockResolvedValue({ isAdmin: true }) };
    const guard = new AdminGuard(users as any);
    await expect(guard.canActivate(makeContext('user-1'))).resolves.toBe(true);
  });
});
