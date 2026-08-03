export function isThinkingError(message: string): boolean {
  return message.includes('thinking') &&
    (message.includes('Expected `thinking`') ||
      message.includes('redacted_thinking') ||
      message.includes('thinking block') ||
      message.includes('thinking: Field required'))
}
