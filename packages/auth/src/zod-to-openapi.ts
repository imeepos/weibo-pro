import { z } from 'zod';

interface OpenAPISchema {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  enum?: unknown[];
  nullable?: boolean;
  description?: string;
}

export const zodToOpenAPI = (schema: z.ZodTypeAny): OpenAPISchema => {
    const description = (schema._def as { description?: string })?.description;
    let result: OpenAPISchema = {};

    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const key in shape) {
            const field = shape[key];
            properties[key] = zodToOpenAPI(field);
            if (!field.isOptional()) {
                required.push(key);
            }
        }

        result = {
            type: 'object',
            properties,
        };
        if (required.length > 0) {
            result.required = required;
        }
    } else if (schema instanceof z.ZodString) {
        result = { type: 'string' };
    } else if (schema instanceof z.ZodNumber) {
        result = { type: 'number' };
    } else if (schema instanceof z.ZodBoolean) {
        result = { type: 'boolean' };
    } else if (schema instanceof z.ZodDate) {
        result = { type: 'string', format: 'date-time' };
    } else if (schema instanceof z.ZodArray) {
        result = {
            type: 'array',
            items: zodToOpenAPI(schema.element as z.ZodTypeAny),
        };
    } else if (schema instanceof z.ZodEnum) {
        result = {
            type: 'string',
            enum: schema.options,
        };
    } else if (schema instanceof z.ZodOptional) {
        result = zodToOpenAPI(schema.unwrap() as z.ZodTypeAny);
    } else if (schema instanceof z.ZodNullable) {
        const inner = zodToOpenAPI(schema.unwrap() as z.ZodTypeAny);
        return { ...inner, nullable: true };
    } else if (schema instanceof z.ZodDefault) {
        result = zodToOpenAPI(schema.unwrap() as z.ZodTypeAny);
    } else if (schema instanceof z.ZodAny) {
        result = {};
    } else {
        // Default fallback for unhandled types
        result = {};
    }
    if (description) {
        result.description = description;
    }
    return result;
};
