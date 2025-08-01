module.exports = {
  testEnvironment: 'node',
  coverageReporters: ['text', 'cobertura', 'lcov'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  rootDir: 'src',
  testRegex: '.spec.ts$',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputName: 'TEST-unit-tests-results.xml',
        outputDirectory: 'test-run-reports',
      },
    ],
  ],
  coverageDirectory: '../test-run-reports/coverage/unit',
  resolver: '<rootDir>/../jest-custom-resolver.cjs',
  moduleNameMapper: {
    '^@openmfp/portal-server-lib$':
      '<rootDir>/../__mocks__/@openmfp/portal-server-lib.js',
  },
};
