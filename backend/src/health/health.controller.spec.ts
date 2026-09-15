import { HealthController } from './health.controller';

function makeController(opts: { dbOk?: boolean; redisOk?: boolean } = { dbOk: true, redisOk: true }) {
  const dataSource = {
    query: opts.dbOk ? jest.fn().mockResolvedValue([{ '?column?': 1 }]) : jest.fn().mockRejectedValue(new Error('db down')),
  };
  const redis = {
    ping: opts.redisOk ? jest.fn().mockResolvedValue('PONG') : jest.fn().mockRejectedValue(new Error('redis down')),
  };
  return new HealthController(dataSource as any, redis as any);
}

describe('HealthController', () => {
  it('reports ok when both dependencies are healthy', async () => {
    const controller = makeController();
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('callstake-backend');
    expect(result.dependencies.database.status).toBe('ok');
    expect(result.dependencies.redis.status).toBe('ok');
  });

  it('reports degraded (not a thrown error) when the database is unreachable', async () => {
    const controller = makeController({ dbOk: false, redisOk: true });
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.database.status).toBe('error');
    expect(result.dependencies.database.error).toBe('db down');
  });

  it('reports degraded when redis is unreachable', async () => {
    const controller = makeController({ dbOk: true, redisOk: false });
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.redis.status).toBe('error');
  });
});
