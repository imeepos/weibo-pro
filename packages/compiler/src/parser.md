
## openai
```json
{
  "id": "019bdfd780dee7ddbcaded7d07a37a57",
  "object": "chat.completion",
  "created": 1768987001,
  "model": "Pro/zai-org/GLM-4.7",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?",
        "reasoning_content": "Let me consider how to respond to this classic programming greeting.\n\n\"Hello World\" is traditionally the first program that developers learn to write. It's a simple, welcoming phrase that has become a universal symbol of beginning something new in the world of programming.\n\nSince this appears to be a friendly greeting, I should respond in a similarly welcoming way. This could be someone:\n1. Just starting to learn programming\n2. Testing if I'm working\n3. Simply being friendly\n\nI think the best response would be to acknowledge the greeting warmly and perhaps offer some assistance. A simple \"Hello! How can I help you today?\" would be appropriate and welcoming.\n\nI should keep my response friendly and open-ended to encourage further conversation if they'd like, while also being professional and helpful.\n\nLet me craft a response that's warm, welcoming, and helpful."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 7,
    "completion_tokens": 180,
    "total_tokens": 187,
    "completion_tokens_details": {
      "reasoning_tokens": 171
    },
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "prompt_cache_hit_tokens": 0,
    "prompt_cache_miss_tokens": 7
  },
  "system_fingerprint": ""
}
```

## anthropic
```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "The user's simple \"Hello World\" input is a standard, non-technical greeting, often used as an initial test. A warm and welcoming response is most appropriate here. Acknowledging the significance of this phrase in programming culture is also beneficial, as it's the canonical first program for many developers. Therefore, the response should start with a standard return greeting, like \"Hello!\", to establish a friendly rapport. Following this, a helpful offer of assistance is crucial to demonstrate the AI's purpose and encourage further interaction. Finally, mentioning the \"Hello World\" tradition is a nice touch to show understanding of the user's likely intent and context. The best structure is a combination of these elements, as seen in the provided good response.", 
      "signature": "uqozacmxth"
    },
    {
      "text": "Hello! Welcome to ByteDance. How can I help you today?",
      "type": "text"
    }
  ],
  "id": "msg_1i6NlaCk0jjn5gGKkJSpcIf5",
  "model": "Pro/zai-org/GLM-4.7",
  "role": "assistant",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "type": "message",
  "usage": {
    "input_tokens": 7,
    "output_tokens": 163
  }
}
```