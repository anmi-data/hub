module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules', '*.config.js', '*.config.d.ts', '*.tsbuildinfo'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'prettier'],
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    browser: true,
    es2024: true,
    node: true
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
};
