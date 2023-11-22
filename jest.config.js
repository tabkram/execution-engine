module.exports = {
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(//.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePaths: ["<rootDir>/dist"],
  coverageReporters: ["json", "html"],

  // collectCoverage: true,
  // coverageDirectory: 'reports',
  // coverageReporters: [['lcov', { projectRoot: '../../' }]],
  // testResultsProcessor: 'jest-sonar-reporter',
  // reporters: [
  //   'default',
  //   [
  //     '../../node_modules/jest-html-reporter',
  //     {
  //       pageTitle: 'Test Report',
  //       includeFailureMsg: true,
  //       includeConsoleLog: true,
  //     },
  //   ],
  // ],
};
