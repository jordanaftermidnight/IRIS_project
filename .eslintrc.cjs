module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Code Quality - relaxed for this project
    'no-console': 'off', // Allow console for CLI tool and debugging
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'warn',
    
    // Best Practices - relaxed
    'eqeqeq': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-await': 'warn',
    'require-await': 'off', // Disabled as many async functions are future-proofed
    
    // Style - more lenient
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never']
  },
  overrides: [
    {
      files: ['tests/**/*.js', 'examples/**/*.js'],
      rules: {
        'no-console': 'off',
        'no-unused-vars': 'off'
      }
    },
    {
      files: ['iris-dashboard.js', '*.cjs'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};