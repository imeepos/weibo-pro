/**
 * Enhanced Zod to OpenAPI Schema Converter
 *
 * Compatible with Zod v4
 */

import { z } from 'zod';
import type { OpenAPISchema } from './openapi.types';
import {
  getZodTypeName,
  applyDescription,
  convertZodObject,
  convertZodString,
  convertZodNumber,
  convertZodBoolean,
  convertZodDate,
  convertZodArray,
  convertZodEnum,
  convertZodLiteral,
  convertZodUnion,
  convertZodDiscriminatedUnion,
  convertZodIntersection,
  convertZodRecord,
  convertZodTuple,
  convertZodOptional,
  convertZodNullable,
  convertZodDefault,
  convertZodEffects,
  convertZodNull,
  convertZodUndefined,
  convertZodAny,
  convertZodUnknown,
  convertZodVoid,
  convertZodNever,
  convertZodPromise,
  convertZodLazy,
  convertZodBranded,
  convertZodNativeEnum,
} from './zod-to-openapi-converters';

/**
 * Convert Zod schema to OpenAPI schema
 */
export const zodToOpenAPI = (schema: z.ZodTypeAny): OpenAPISchema => {
  let result: OpenAPISchema = {};
  const typeName = getZodTypeName(schema);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = schema._def as any;

  // ZodObject - object types
  if (schema instanceof z.ZodObject) {
    result = convertZodObject(schema, def, zodToOpenAPI);
  }

  // ZodString - string types
  else if (schema instanceof z.ZodString) {
    result = convertZodString(schema, def);
  }

  // ZodNumber - number types
  else if (schema instanceof z.ZodNumber) {
    result = convertZodNumber(schema, def);
  }

  // ZodBoolean
  else if (schema instanceof z.ZodBoolean) {
    result = convertZodBoolean();
  }

  // ZodDate
  else if (schema instanceof z.ZodDate) {
    result = convertZodDate();
  }

  // ZodArray
  else if (schema instanceof z.ZodArray) {
    result = convertZodArray(schema, def, zodToOpenAPI);
  }

  // ZodEnum - string enums
  else if (schema instanceof z.ZodEnum) {
    result = convertZodEnum(schema);
  }

  // ZodLiteral - literal values
  else if (schema instanceof z.ZodLiteral) {
    result = convertZodLiteral(schema, def);
  }

  // ZodUnion - union types
  else if (schema instanceof z.ZodUnion) {
    result = convertZodUnion(schema, def, zodToOpenAPI);
  }

  // ZodDiscriminatedUnion - discriminated unions
  else if (typeName === 'ZodDiscriminatedUnion') {
    result = convertZodDiscriminatedUnion(schema, def, zodToOpenAPI);
  }

  // ZodIntersection - intersection types
  else if (schema instanceof z.ZodIntersection) {
    result = convertZodIntersection(schema, def, zodToOpenAPI);
  }

  // ZodRecord - dictionary/map types
  else if (schema instanceof z.ZodRecord) {
    result = convertZodRecord(schema, def, zodToOpenAPI);
  }

  // ZodTuple - tuple types
  else if (schema instanceof z.ZodTuple) {
    result = convertZodTuple(schema, def, zodToOpenAPI);
  }

  // ZodOptional - optional wrapper
  else if (schema instanceof z.ZodOptional) {
    result = convertZodOptional(schema, def, zodToOpenAPI);
  }

  // ZodNullable - nullable wrapper
  else if (schema instanceof z.ZodNullable) {
    result = convertZodNullable(schema, def, zodToOpenAPI);
  }

  // ZodDefault - default value wrapper
  else if (schema instanceof z.ZodDefault) {
    result = convertZodDefault(schema, def, zodToOpenAPI);
  }

  // ZodEffects - transformed/refined types (check by typeName)
  else if (typeName === 'ZodEffects' || typeName === 'ZodPipeline') {
    result = convertZodEffects(schema, def, zodToOpenAPI);
  }

  // ZodNull
  else if (schema instanceof z.ZodNull) {
    result = convertZodNull();
  }

  // ZodUndefined - treated as optional
  else if (schema instanceof z.ZodUndefined) {
    result = convertZodUndefined();
  }

  // ZodAny - any type
  else if (schema instanceof z.ZodAny) {
    result = convertZodAny();
  }

  // ZodUnknown - unknown type
  else if (schema instanceof z.ZodUnknown) {
    result = convertZodUnknown();
  }

  // ZodVoid - void type
  else if (schema instanceof z.ZodVoid) {
    result = convertZodVoid();
  }

  // ZodNever - never type
  else if (schema instanceof z.ZodNever) {
    result = convertZodNever();
  }

  // ZodPromise - unwrap promise
  else if (schema instanceof z.ZodPromise) {
    result = convertZodPromise(schema, def, zodToOpenAPI);
  }

  // ZodLazy - lazy evaluation
  else if (schema instanceof z.ZodLazy) {
    result = convertZodLazy(schema, def, zodToOpenAPI);
  }

  // ZodBranded - branded types (check by typeName)
  else if (typeName === 'ZodBranded') {
    result = convertZodBranded(schema, def, zodToOpenAPI);
  }

  // ZodNativeEnum - native enums (check by typeName)
  else if (typeName === 'ZodNativeEnum') {
    result = convertZodNativeEnum(schema, def);
  }

  // Fallback for unhandled types
  else {
    result = {};
  }

  return applyDescription(result, schema);
};
