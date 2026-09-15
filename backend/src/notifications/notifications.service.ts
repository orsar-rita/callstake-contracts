import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ContractEventNotification {
  slot: string;
  eventType: string;
  data: unknown;
  timestamp: string;
}

export const CONTRACT_EVENT = 'contract.event';

/**
 * Minimal, event-driven only — no persistence, no email/push delivery, no
 * per-user targeting or read/unread state. The event indexer module is the
 * intended producer (a contract event it picks up gets published here);
 * this module is purely "fan it out to whoever's listening right now" via
 * SSE. See docs/BACKEND_SCOPE.md.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(slot: string, eventType: string, data: unknown): void {
    const notification: ContractEventNotification = {
      slot,
      eventType,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit(CONTRACT_EVENT, notification);
  }
}
