import type { UserInvestigationDossier } from '@sker/sdk';

export interface ProfileNormalizationContext {
  dossier: UserInvestigationDossier;
  promptVersion: string;
  requestedModel: string;
}

export interface EvidencePoolItem {
  sourceTable: string;
  sourceId: string;
  excerpt?: string;
  score: number;
}
