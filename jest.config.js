module.exports = {
  testRegex: "(/tests/*.test.ts|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  coverageReporters: ["html", "text", "text-summary", "cobertura", "lcov"],
  collectCoverageFrom: ["**/*.ts", "!**/node_modules/**","!tests/**"],
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
