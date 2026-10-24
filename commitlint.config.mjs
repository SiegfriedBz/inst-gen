export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Add a scope here when a new area of the code appears.
    'scope-enum': [2, 'always', ['harness', 'docs', 'skills', 'ci', 'deps', 'web', 'brand']],
  },
};
