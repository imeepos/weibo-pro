import { Injectable } from '@sker/core';
import type {
  UserInvestigationQueueResponse,
} from '@sker/sdk';
import type {
  InvestigationQueueOptions,
  InvestigationQueueRow,
} from './types';

@Injectable({ providedIn: 'root' })
export class InvestigationQueueService {
  async getQueue(query: InvestigationQueueOptions): Promise<UserInvestigationQueueResponse> {
    const rows = await this.fetchQueueRows(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = rows.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
      items: rows.map(({ taskStatus, ...item }) => ({
        ...item,
        status: taskStatus,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  protected async fetchQueueRows(_query: InvestigationQueueOptions): Promise<InvestigationQueueRow[]> {
    return [];
  }
}
