export default {
  testRegex: "(/tests/*.test.ts|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  coverageReporters: ["html", "text", "text-summary", "cobertura", "lcov"],
  collectCoverageFrom: ["**/*.ts", "!**/node_modules/**","!tests/**"],
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  extensionsToTreatAsEsm: [".ts"],
  setupFilesAfterEnv: ["./node_modules/@grandlinex/core/jest.pre.config.js"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        "useESM": true
      }
    ]
  }
};
