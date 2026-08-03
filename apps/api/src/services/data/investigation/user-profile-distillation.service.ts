import { Injectable } from '@sker/core';
import type { DistilledUserProfile, UserInvestigationDossier } from '@sker/sdk';
import { useLlmModel } from '@sker/workflow-run';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import type { ProfileNormalizationContext } from './user-profile-distillation.types';
import {
  buildAggregatedInputMessages,
  buildDistillationMessages,
  type AggregatedDistillationInput,
} from './user-profile-distillation.prompts';
import {
  isStructuredOutputParseFailure,
  normalizeProfileResponse,
  validateProfile as parseValidatedProfile,
} from './user-profile-distillation.response';
import { buildInvocationFallbackProfile } from './user-profile-distillation.fallback';

const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.2';

@Injectable({ providedIn: 'root' })
export class UserProfileDistillationService {
  validateProfile(payload: unknown): DistilledUserProfile {
    return parseValidatedProfile(payload);
  }

  async distill(
    dossier: UserInvestigationDossier,
    options: { model?: string; temperature?: number } = {},
  ): Promise<DistilledUserProfile> {
    const requestedModel = options.model ?? DEFAULT_MODEL;
    const promptVersion = 'v2';
    const normalizationContext: ProfileNormalizationContext = {
      dossier,
      promptVersion,
      requestedModel,
    };
    const model = useLlmModel({
      model: requestedModel,
      temperature: options.temperature ?? 0.2,
    });

    const messages = buildDistillationMessages(dossier);

    if (typeof (model as any).withStructuredOutput === 'function') {
      const structuredModel = (model as any).withStructuredOutput(distilledUserProfileSchema);
      try {
        const response = await structuredModel.invoke(messages);
        return normalizeProfileResponse(response, normalizationContext);
      } catch (error) {
        if (!isStructuredOutputParseFailure(error)) {
          return buildInvocationFallbackProfile(normalizationContext, error);
        }
      }
    }

    try {
      const response = await model.invoke(messages);
      return normalizeProfileResponse(response, normalizationContext);
    } catch (error) {
      return buildInvocationFallbackProfile(normalizationContext, error);
    }
  }

  async distillFromAggregatedInput(
    input: AggregatedDistillationInput,
  ): Promise<DistilledUserProfile> {
    const requestedModel = DEFAULT_MODEL;
    const promptVersion = 'v3';
    const normalizationContext: ProfileNormalizationContext = {
      dossier: input.dossier,
      promptVersion,
      requestedModel,
    };
    const model = useLlmModel({
      model: requestedModel,
      temperature: 0.2,
    });

    const response = await model.invoke(buildAggregatedInputMessages(input));

    return normalizeProfileResponse(response, normalizationContext);
  }
}
