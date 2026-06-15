// Plain-JS Jest config so Jest doesn't require ts-node to load it.
// ts-jest still compiles the TypeScript test sources.
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  collectCoverageFrom: ["src/server/**/*.ts", "src/lib/rbac.ts"],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 85, statements: 85 },
  },
};
