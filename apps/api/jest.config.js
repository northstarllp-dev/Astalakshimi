module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@astalakshimi/database$': '<rootDir>/../../packages/database/dist/index',
    '^@astalakshimi/database/(.*)$': '<rootDir>/../../packages/database/dist/$1',
    '^@astalakshimi/types$': '<rootDir>/../../packages/types/dist/index',
    '^@astalakshimi/types/(.*)$': '<rootDir>/../../packages/types/dist/$1',
    '^@astalakshimi/validation$': '<rootDir>/../../packages/validation/dist/index',
    '^@astalakshimi/validation/(.*)$': '<rootDir>/../../packages/validation/dist/$1',
  },
};
