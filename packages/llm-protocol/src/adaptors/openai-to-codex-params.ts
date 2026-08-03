import type {
  CodexFunctionParameters,
  CodexParameterProperty,
} from './types/codex';

/**
 * 转换 OpenAI 工具参数为 Codex 参数格式
 */
export function convertParameters(
  parameters?: Record<string, unknown>,
): CodexFunctionParameters {
  if (!parameters || typeof parameters !== 'object') {
    return {
      type: 'object',
      properties: {},
    };
  }

  const props = (parameters.properties as Record<string, any>) || {};
  const required = (parameters.required as string[]) || [];

  return {
    type: 'object',
    properties: convertProperties(props),
    required: required.length > 0 ? required : undefined,
    additionalProperties: parameters.additionalProperties as boolean | undefined,
  };
}

export function convertProperties(
  props: Record<string, any>,
): Record<string, CodexParameterProperty> {
  const result: Record<string, CodexParameterProperty> = {};

  for (const [key, value] of Object.entries(props)) {
    result[key] = convertProperty(value);
  }

  return result;
}

export function convertProperty(prop: any): CodexParameterProperty {
  const property: CodexParameterProperty = {
    type: prop.type || 'string',
  };

  if (prop.description) property.description = prop.description;
  if (prop.default !== undefined) property.default = prop.default;
  if (prop.enum) property.enum = prop.enum;
  if (prop.minimum !== undefined) property.minimum = prop.minimum;
  if (prop.maximum !== undefined) property.maximum = prop.maximum;
  if (prop.minLength !== undefined) property.minLength = prop.minLength;
  if (prop.format) property.format = prop.format;
  if (prop.title) property.title = prop.title;
  if (prop.exclusiveMinimum !== undefined) {
    property.exclusiveMinimum = prop.exclusiveMinimum;
  }
  if (prop.exclusiveMaximum !== undefined) {
    property.exclusiveMaximum = prop.exclusiveMaximum;
  }

  if (prop.items) {
    property.items = convertProperty(prop.items);
  }

  if (prop.properties) {
    property.properties = convertProperties(prop.properties);
    if (prop.required) {
      property.required = prop.required;
    }
    if (prop.additionalProperties !== undefined) {
      property.additionalProperties = prop.additionalProperties;
    }
  }

  return property;
}
