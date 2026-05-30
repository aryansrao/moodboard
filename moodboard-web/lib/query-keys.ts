export const queryKeys = {
  conversations: () => ['conversations'] as const,
  conversationRequests: () => ['conversations', 'requests'] as const,
  messages: (convId: string) => ['messages', convId] as const,
  contacts: () => ['contacts'] as const,
  collections: () => ['collections'] as const,
}
