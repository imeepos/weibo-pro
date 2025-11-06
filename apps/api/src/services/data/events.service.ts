import { Injectable } from '@sker/core';
import { HotEvent, TimeRange } from './types';
import { useEntityManager } from '@sker/entities';
import { EventRepository } from './repositories/event.repository';

@Injectable({ providedIn: 'root' })
export class EventsService {

  async getHotList(timeRange: TimeRange): Promise<HotEvent[]> {
    return await useEntityManager(async entityManager => {
      const eventRepository = new EventRepository(entityManager);
      return await eventRepository.findHotEvents(timeRange);
    });
  }
}