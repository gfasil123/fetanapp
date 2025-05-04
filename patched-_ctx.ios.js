// This is a patched version of the ctx file
const appDirectory = './app';

// Create a simple version that works without require.context
export const ctx = {
  keys: () => [],
  resolve: (key) => key,
  id: 'patched-context'
}; 