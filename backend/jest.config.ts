module.exports = {
  testEnvironment: 'node',
  coverageReporters: ['text', 'cobertura', 'lcov'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  rootDir: 'src',
  testRegex: '.spec.ts$',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  resolver: '<rootDir>/../jest-custom-resolver.cjs',
  moduleNameMapper: {
    '^@openmfp/portal-server-lib$':
      '<rootDir>/../__mocks__/@openmfp/portal-server-lib.js',
  },
};
