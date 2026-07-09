export default [
  {
    ignores: ['node_modules/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        URL: 'readonly',
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {}
  }
];
