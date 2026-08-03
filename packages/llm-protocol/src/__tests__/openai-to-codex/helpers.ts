import { OpenAIToCodexConverter } from '../../adaptors/openai-to-codex.converter';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createConverter(): OpenAIToCodexConverter {
  return new OpenAIToCodexConverter();
}
