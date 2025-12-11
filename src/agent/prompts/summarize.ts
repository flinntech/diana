/**
 * Context Summarization Prompt
 *
 * Feature: 002-llm-agent-core
 * Date: 2025-12-10
 *
 * Prompt template for summarizing conversation context.
 */

/**
 * System prompt for context summarization
 */
export const SUMMARIZATION_SYSTEM_PROMPT = `You are a conversation summarizer. Your task is to create a concise summary of the conversation context that preserves:

1. Key facts and information discussed
2. Important decisions or conclusions reached
3. User preferences or requirements mentioned
4. Any ongoing tasks or topics being worked on

Keep the summary focused and brief while preserving all important context that would be needed to continue the conversation naturally.`;

/**
 * Format messages for summarization
 */
export function formatMessagesForSummary(
  messages: Array<{ role: string; content: string }>
): string {
  return messages
    .map((m) => {
      const roleLabel = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : m.role;
      return `${roleLabel}: ${m.content}`;
    })
    .join('\n\n');
}

/**
 * Generate the user prompt for summarization
 */
export function generateSummarizationPrompt(
  formattedMessages: string
): string {
  return `Please summarize the following conversation, preserving key facts, decisions, and context:

${formattedMessages}

Provide a concise summary:`;
}
