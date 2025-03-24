/**
 * Mock for the validate-todos script
 */

// Import mock validators
const mockValidateTodos = require('../src/utils/todo-validator').validateTodos;

// Mock main function that the test expects
const main = jest.fn().mockImplementation(async () => {
  // Call the mocked validateTodos with the expected arguments
  await mockValidateTodos('/test/project', {
    depth: 'standard',
    reportMissing: true,
    suggestTodos: true,
    includeDotFiles: false,
    includeNodeModules: false,
    maxFileSize: 10485760
  });
  return Promise.resolve();
});

module.exports = {
  main
};