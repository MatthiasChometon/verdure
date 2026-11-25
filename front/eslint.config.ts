import vueI18n from '@intlify/eslint-plugin-vue-i18n';
import jsonc from 'eslint-plugin-jsonc';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  ...jsonc.configs['flat/recommended-with-json'],
  ...jsonc.configs['flat/prettier'],
  {
    // Type-aware rules read the same TypeScript projects as `nuxt typecheck`.
    files: ['**/*.{ts,vue}'],
    // The service worker lives in its own webworker project (see nuxt.config.ts).
    ignores: ['domain/reminders/pwa/sw.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./.nuxt/tsconfig.app.json', './.nuxt/tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    rules: {
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': ['error', { html: { void: 'always' } }],
    },
  },
  {
    files: ['infrastructure/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domain/**', '~~/domain/**'],
              message: 'The infrastructure layer must never import the domain layer.',
            },
          ],
        },
      ],
    },
  },
  ...vueI18n.configs.recommended,
  {
    rules: {
      '@intlify/vue-i18n/no-raw-text': [
        'error',
        {
          ignorePattern: '^[-—·.©0-9\\s]+$',
        },
      ],
    },
    settings: {
      'vue-i18n': {
        localeDir: './**/translation/*.json',
        messageSyntaxVersion: '^11.0.0',
      },
    },
  },
);
