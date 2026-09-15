import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('validate() passes the decoded payload straight through as req.user', () => {
    const configService = { get: jest.fn(() => 'a-secret-at-least-16-chars') };
    const strategy = new JwtStrategy(configService as any);

    const payload = { sub: 'user-1', walletAddress: 'GADDR' };
    expect(strategy.validate(payload)).toBe(payload);
  });
});
