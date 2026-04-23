import { Injectable } from '@sker/core';
import type { DistilledUserProfile } from '@sker/sdk';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';

@Injectable({ providedIn: 'root' })
export class UserProfileDistillationService {
  validateProfile(payload: unknown): DistilledUserProfile {
    return distilledUserProfileSchema.parse(payload) as DistilledUserProfile;
  }
}
