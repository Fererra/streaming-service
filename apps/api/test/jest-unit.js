import baseConfig from '../../../jest.config.base.js';

export default {
  ...baseConfig,
  rootDir: '..',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  roots: ['<rootDir>/test/unit'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@app/config(.*)$': '<rootDir>/../../libs/config/src$1',
    '^@app/payment(.*)$': '<rootDir>/../../libs/payment/src$1',
    '^@app/user-subscription(.*)$':
      '<rootDir>/../../libs/user-subscription/src$1',
  },
};
