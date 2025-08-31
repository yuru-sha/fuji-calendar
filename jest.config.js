module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/integration/test-*.ts',
    '**/tests/integration/test_*.js',
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "test-cache-consistency.js"
  ],
  passWithNoTests: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/client/main.tsx'
  ],
  moduleNameMapper: {
    '^@fuji-calendar/types$': '<rootDir>/packages/types/src',
    '^@fuji-calendar/utils$': '<rootDir>/packages/utils/src',
    '^@fuji-calendar/server/(.*)$': '<rootDir>/apps/server/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};