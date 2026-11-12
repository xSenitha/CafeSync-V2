import apiClient from './client';

export const assistantAPI = {
  chat: ({ message, history = [] }, { signal } = {}) => apiClient.post(
    '/assistant/chat',
    {
      message: message.trim(),
      history: history
        .filter((entry) => ['user', 'assistant'].includes(entry.role) && typeof entry.content === 'string')
        .slice(-10)
        .map(({ role, content }) => ({ role, content: content.slice(0, 1000) })),
    },
    { timeout: 35000, signal },
  ),
};
