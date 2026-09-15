import { Controller, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, map, Observable } from 'rxjs';
import { CONTRACT_EVENT, ContractEventNotification } from './notifications.service';

interface SseMessage {
  data: ContractEventNotification;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly emitter: EventEmitter2) {}

  @Sse('stream')
  stream(): Observable<SseMessage> {
    return fromEvent<ContractEventNotification>(this.emitter, CONTRACT_EVENT).pipe(
      map((notification) => ({ data: notification })),
    );
  }
}
