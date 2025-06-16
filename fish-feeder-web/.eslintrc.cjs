module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true 
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: [
    'react-refresh',
    '@typescript-eslint',
    'react',
    'jsx-a11y',
    'import'
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    // === PRODUCTION COMPLIANCE RULES ===
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': 'error',
    
    // === TYPESCRIPT RULES ===
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    
    // === REACT RULES ===
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/no-unescaped-entities': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // === ACCESSIBILITY RULES ===
    'jsx-a11y/label-has-associated-control': [
      'error',
      {
        required: {
          some: ['nesting', 'id']
        }
      }
    ],
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/alt-text': 'error',
    
    // === IMPORT RULES ===
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/no-unused-modules': 'off', // Can be expensive
    
    // === CODE QUALITY RULES ===
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': ['error', 'never'],
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'eol-last': ['error', 'always'],
    'comma-dangle': ['error', 'only-multiline'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    
    // === PERFORMANCE RULES ===
    'no-await-in-loop': 'warn',
    'require-atomic-updates': 'error',
    
    // === SECURITY RULES ===
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // === IoT SPECIFIC RULES ===
    'no-restricted-globals': [
      'error',
      {
        name: 'setTimeout',
        message: 'Use proper async/await instead of setTimeout for IoT operations'
      }
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.name="setInterval"]',
        message: 'Use proper event-driven patterns instead of setInterval for IoT'
      },
      {
        selector: 'CallExpression[callee.property.name="sleep"]',
        message: 'Blocking sleep() operations are forbidden in IoT systems'
      },
      {
        selector: 'CallExpression[callee.property.name="delay"]', 
        message: 'Blocking delay() operations are forbidden in IoT systems'
      }
    ]
  },
  overrides: [
    // === DEVELOPMENT FILES ===
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
        'vitest-globals/env': true
      },
      extends: ['plugin:vitest-globals/recommended'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    },
    
    // === CONFIGURATION FILES ===
    {
      files: ['**/*.config.js', '**/*.config.ts', '**/*.config.cjs'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    
    // === PRODUCTION BUILD FILES ===
    {
      files: ['dist/**/*', 'build/**/*'],
      rules: {
        'no-console': 'error',
        'no-debugger': 'error'
      }
    }
  ]
}; 