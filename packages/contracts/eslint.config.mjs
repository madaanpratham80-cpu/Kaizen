import eslint from '@eslint/js';
export default [
  { ignores: ['dist/**'] },
  eslint.configs.recommended,
  { languageOptions: { globals: { TextEncoder: 'readonly' } } },
];
