/**
 * Enhanced Zod to OpenAPI Schema Converter - 各类型转换器
 *
 * Compatible with Zod v4
 */

import { z } from 'zod';
import type { OpenAPISchema } from './openapi.types';

export type ZodConvert = (schema: z.ZodTypeAny) => OpenAPISchema;

/**
 * Get description from Zod schema definition
 */
export function getDescription(schema: z.ZodTypeAny): string | undefined {
  return (schema._def as { description?: string })?.description;
}

/**
 * Apply description to schema if present
 */
export function applyDescription(result: OpenAPISchema, schema: z.ZodTypeAny): OpenAPISchema {
  const description = getDescription(schema);
  if (description) {
    result.description = description;
  }
  return result;
}

/**
 * Get Zod type name from schema
 */
export function getZodTypeName(schema: z.ZodTypeAny): string {
  // Use _zod.typeName or fallback to constructor name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = schema._def as any;
  return def.typeName || schema.constructor.name;
}

// ==================== Object-like types ====================

export function convertZodObject(schema: any, _def: any, convert: ZodConvert): OpenAPISchema {
  const shape = schema.shape;
  const properties: Record<string, OpenAPISchema> = {};
  const required: string[] = [];

  for (const key in shape) {
    const field = shape[key];
    properties[key] = convert(field);
    if (!field.isOptional()) {
      required.push(key);
    }
  }

  const result: OpenAPISchema = { type: 'object', properties };
  if (required.length > 0) {
    result.required = required;
  }
  return result;
}

export function convertZodRecord(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const valueSchema = convert(def.valueType as z.ZodTypeAny);
  return {
    type: 'object',
    additionalProperties: valueSchema,
  };
}

export function convertZodTuple(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const items = (def.items || []).map((item: z.ZodTypeAny) => convert(item));
  return {
    type: 'array',
    prefixItems: items,
    minItems: items.length,
    maxItems: items.length,
  };
}

export function convertZodArray(schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const itemSchema = convert(schema.element as z.ZodTypeAny);
  const result: OpenAPISchema = { type: 'array', items: itemSchema };

  // Array length constraints
  if (def.minLength !== undefined) {
    result.minItems = def.minLength.value;
  }
  if (def.maxLength !== undefined) {
    result.maxItems = def.maxLength.value;
  }
  return result;
}

// ==================== Primitive types ====================

export function convertZodString(_schema: any, def: any): OpenAPISchema {
  const result: OpenAPISchema = { type: 'string' };

  // Extract string checks for validation
  const checks = def.checks || [];
  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        result.minLength = check.value;
        break;
      case 'max':
        result.maxLength = check.value;
        break;
      case 'email':
        result.format = 'email';
        break;
      case 'url':
        result.format = 'uri';
        break;
      case 'uuid':
        result.format = 'uuid';
        break;
      case 'datetime':
        result.format = 'date-time';
        break;
      case 'regex':
        if (check.regex) {
          result.pattern = check.regex.source;
        }
        break;
    }
  }
  return result;
}

export function convertZodNumber(_schema: any, def: any): OpenAPISchema {
  const result: OpenAPISchema = { type: 'number' };

  // Check for integer
  const checks = def.checks || [];
  for (const check of checks) {
    switch (check.kind) {
      case 'int':
        result.type = 'integer';
        break;
      case 'min':
        if (check.inclusive === false) {
          result.exclusiveMinimum = check.value;
        } else {
          result.minimum = check.value;
        }
        break;
      case 'max':
        if (check.inclusive === false) {
          result.exclusiveMaximum = check.value;
        } else {
          result.maximum = check.value;
        }
        break;
      case 'multipleOf':
        result.multipleOf = check.value;
        break;
    }
  }
  return result;
}

export function convertZodBoolean(): OpenAPISchema {
  return { type: 'boolean' };
}

export function convertZodDate(): OpenAPISchema {
  return { type: 'string', format: 'date-time' };
}

// ==================== Enum / Union types ====================

export function convertZodEnum(schema: any): OpenAPISchema {
  return {
    type: 'string',
    enum: schema.options,
  };
}

export function convertZodLiteral(_schema: any, def: any): OpenAPISchema {
  // Zod v4 uses 'values', Zod v3 uses 'value'
  const value = def.value !== undefined ? def.value : def.values;
  const type = typeof value;

  if (type === 'string') {
    return { type: 'string', const: value };
  } else if (type === 'number') {
    return { type: Number.isInteger(value as number) ? 'integer' : 'number', const: value };
  } else if (type === 'boolean') {
    return { type: 'boolean', const: value };
  } else {
    return { const: value };
  }
}

export function convertZodUnion(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const options = (def.options || []).map((opt: z.ZodTypeAny) => convert(opt));
  return { oneOf: options };
}

export function convertZodDiscriminatedUnion(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  let opts: z.ZodTypeAny[] = [];
  if (def.options instanceof Map) {
    opts = Array.from(def.options.values());
  } else if (Array.isArray(def.options)) {
    opts = def.options;
  } else if (def.optionsMap instanceof Map) {
    opts = Array.from(def.optionsMap.values());
  }
  return { oneOf: opts.map(convert) };
}

export function convertZodIntersection(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const left = convert(def.left as z.ZodTypeAny);
  const right = convert(def.right as z.ZodTypeAny);
  return { allOf: [left, right] };
}

export function convertZodNativeEnum(_schema: any, def: any): OpenAPISchema {
  if (def.values) {
    const enumValues = Object.values(def.values);
    const isNumberEnum = enumValues.every(v => typeof v === 'number');
    return {
      type: isNumberEnum ? 'integer' : 'string',
      enum: enumValues,
    };
  }
  return {};
}

// ==================== Wrapper types ====================

export function convertZodOptional(schema: any, _def: any, convert: ZodConvert): OpenAPISchema {
  return convert(schema.unwrap() as z.ZodTypeAny);
}

export function convertZodNullable(schema: any, _def: any, convert: ZodConvert): OpenAPISchema {
  const inner = convert(schema.unwrap() as z.ZodTypeAny);
  return { ...inner, nullable: true };
}

export function convertZodDefault(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const result: OpenAPISchema = {};
  const innerType = def.innerType || def.type;
  if (innerType) {
    Object.assign(result, convert(innerType));
  }
  if (typeof def.defaultValue === 'function') {
    result.default = def.defaultValue();
  }
  return result;
}

export function convertZodEffects(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const innerSchema = def.schema || def.innerType || def.in;
  if (innerSchema) {
    return convert(innerSchema);
  }
  return {};
}

export function convertZodPromise(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const innerType = def.type;
  if (innerType && typeof innerType !== 'string') {
    return convert(innerType);
  }
  return {};
}

export function convertZodLazy(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  if (typeof def.getter === 'function') {
    return convert(def.getter());
  }
  return {};
}

export function convertZodBranded(_schema: any, def: any, convert: ZodConvert): OpenAPISchema {
  const innerType = def.type;
  if (innerType) {
    return convert(innerType);
  }
  return {};
}

// ==================== Special types ====================

export const convertZodNull = (): OpenAPISchema => ({ type: 'null' });
export const convertZodUndefined = (): OpenAPISchema => ({});
export const convertZodAny = (): OpenAPISchema => ({});
export const convertZodUnknown = (): OpenAPISchema => ({});
export const convertZodVoid = (): OpenAPISchema => ({});
export const convertZodNever = (): OpenAPISchema => ({ not: {} });

