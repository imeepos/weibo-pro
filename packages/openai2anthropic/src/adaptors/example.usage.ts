import { OpenAIToCodexConverter } from './openai-to-codex.converter';
import type { OpenAIRequest } from './types/openai';

const converter = new OpenAIToCodexConverter();

const openaiRequest: OpenAIRequest = {
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant.',
    },
    {
      role: 'user',
      content: 'What is the weather in Beijing?',
    },
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather in a given location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA',
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
            },
          },
          required: ['location'],
        },
      },
    },
  ],
  tool_choice: 'auto',
  temperature: 0.7,
  max_tokens: 1000,
  stream: false,
};

const codexRequest = converter.convert(openaiRequest);

console.log(JSON.stringify(codexRequest, null, 2));
