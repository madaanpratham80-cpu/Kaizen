import eslint from '@eslint/js';
export default [
  { ignores: ['dist/**'] },
  eslint.configs.recommended,
  {
    languageOptions: {
      globals: { Buffer: 'readonly', process: 'readonly', URL: 'readonly' },
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
];
