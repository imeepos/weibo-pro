import type {
  InvestigationTaskStatus,
  UserInvestigationDossier,
  UserInvestigationQueueItem,
  UserInvestigationQueueQuery,
} from '@sker/sdk';

export interface InvestigationQueueRow extends UserInvestigationQueueItem {
  taskStatus: InvestigationTaskStatus;
}

export interface InvestigationQueueOptions extends UserInvestigationQueueQuery {
  page: number;
  pageSize: number;
}

export interface UserDossierOptions {
  eventId?: string;
  windowDays: number;
}

export type UserDossierAccountSnapshot = UserInvestigationDossier['accountSnapshot'];
export type UserDossierEvidenceSamples = UserInvestigationDossier['evidenceSamples'];
