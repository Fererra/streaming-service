import baseConfig from '../../../jest.config.base.js';

export default {
  ...baseConfig,
  rootDir: '..',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  roots: ['<rootDir>/test/unit'],
};
