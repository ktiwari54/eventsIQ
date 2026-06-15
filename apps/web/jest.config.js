// Plain-JS Jest config so Jest doesn't require ts-node to load it.
// ts-jest still compiles the TypeScript test sources.
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  // Coverage is enforced on the pure, deterministic core logic. DB/route/UI
  // layers are exercised by Playwright e2e rather than unit coverage.
  collectCoverageFrom: [
    "src/server/scoring.ts",
    "src/server/roi.ts",
    "src/server/csv.ts",
    "src/server/cron.ts",
    "src/server/validation.ts",
    "src/lib/metrics.ts",
    "src/lib/rbac.ts",
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 90, lines: 90, statements: 90 },
  },
};
