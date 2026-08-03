import type { DistilledUserProfile } from '@sker/sdk';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import type { ProfileNormalizationContext } from './user-profile-distillation.types';
import { applyProfileDefaults, normalizeMemoryDrafts } from './user-profile-distillation.memory-drafts';
import { tryCoerceProfilePayload } from './user-profile-distillation.coercion';
import { asRecord } from './user-profile-distillation.utils';
import {
  collectProfileCandidates,
  extractJsonPayloads,
} from './user-profile-distillation.payload-extraction';

export function validateProfile(payload: unknown): DistilledUserProfile {
  return distilledUserProfileSchema.parse(payload) as DistilledUserProfile;
}

export function isStructuredOutputParseFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message || '';
  const stack = error.stack || '';

  return (
    error instanceof SyntaxError ||
    /Unexpected token .* is not valid JSON/i.test(message) ||
    stack.includes('@langchain/openai/dist/utils/output.js')
  );
}

export function normalizeProfileResponse(
  response: unknown,
  context: ProfileNormalizationContext,
): DistilledUserProfile {
  const directProfile = tryValidateProfile(response, context);
  if (directProfile) {
    return directProfile;
  }

  for (const candidate of collectProfileCandidates(response)) {
    if (typeof candidate === 'string') {
      const parsedProfile = tryParseProfileResponse(candidate, context);
      if (parsedProfile) {
        return parsedProfile;
      }
      continue;
    }

    const nestedProfile = tryValidateProfile(candidate, context);
    if (nestedProfile) {
      return nestedProfile;
    }
  }

  return validateProfile(response);
}

export function tryValidateProfile(
  payload: unknown,
  context?: ProfileNormalizationContext,
): DistilledUserProfile | null {
  const result = distilledUserProfileSchema.safeParse(payload);
  if (result.success) {
    return context ? applyProfileDefaults(result.data as DistilledUserProfile, context) : (result.data as DistilledUserProfile);
  }

  if (!context) {
    return null;
  }

  const sanitizedProfile = tryNormalizeSchemaCompatibleProfile(payload, context);
  if (sanitizedProfile) {
    return sanitizedProfile;
  }

  return tryCoerceProfilePayload(payload, context);
}

export function parseProfileResponse(response: string): DistilledUserProfile {
  const parsedProfile = tryParseProfileResponse(response);
  if (parsedProfile) {
    return parsedProfile;
  }

  const [rawCandidate] = extractJsonPayloads(response);
  return validateProfile(JSON.parse(rawCandidate ?? response.trim()));
}

export function tryParseProfileResponse(
  response: string,
  context?: ProfileNormalizationContext,
): DistilledUserProfile | null {
  for (const raw of extractJsonPayloads(response)) {
    try {
      const payload = JSON.parse(raw);
      const profile = tryValidateProfile(payload, context);
      if (profile) {
        return profile;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function tryNormalizeSchemaCompatibleProfile(
  payload: unknown,
  context: ProfileNormalizationContext,
): DistilledUserProfile | null {
  const record = asRecord(payload);
  if (!record || !Array.isArray(record.memoryDrafts)) {
    return null;
  }

  const normalizedMemoryDrafts = normalizeMemoryDrafts(record.memoryDrafts);
  if (normalizedMemoryDrafts.length === 0) {
    return null;
  }

  const candidate = {
    ...record,
    memoryDrafts: normalizedMemoryDrafts,
  };

  const result = distilledUserProfileSchema.safeParse(candidate);
  return result.success ? applyProfileDefaults(result.data as DistilledUserProfile, context) : null;
}
