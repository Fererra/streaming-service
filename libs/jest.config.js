import baseConfig from '../jest.config.base.js';

export default {
  ...baseConfig,
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['**/src/**/*.(t|j)s', '!**/index.ts'],
  coverageDirectory: './coverage',
  roots: ['<rootDir>'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@app/config(.*)$': '<rootDir>/config/src$1',
    '^@app/payment(.*)$': '<rootDir>/payment/src$1',
    '^@app/user-subscription(.*)$': '<rootDir>/user-subscription/src$1',
  },
};
