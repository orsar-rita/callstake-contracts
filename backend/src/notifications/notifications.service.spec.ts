import { EventEmitter2 } from '@nestjs/event-emitter';
import { CONTRACT_EVENT, NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('publishes a well-formed notification that listeners receive', async () => {
    const emitter = new EventEmitter2();
    const service = new NotificationsService(emitter);

    const received = new Promise((resolve) => emitter.once(CONTRACT_EVENT, resolve));
    service.publish('signal_registry', 'SignalCreated', { signalId: 42 });

    const notification = (await received) as any;
    expect(notification.slot).toBe('signal_registry');
    expect(notification.eventType).toBe('SignalCreated');
    expect(notification.data).toEqual({ signalId: 42 });
    expect(typeof notification.timestamp).toBe('string');
  });
});
