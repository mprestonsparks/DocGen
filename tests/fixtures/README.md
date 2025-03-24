# Test Fixtures

This directory contains fixture files for testing DocGen and its modules.

## paper_architect Module

The `test-paper.pdf` file is a minimal PDF file used for testing the paper_architect module. It's intentionally kept simple to allow tests to run without requiring full PDF parsing.

### Running Tests with GROBID

To run the complete end-to-end tests for the paper_architect module that require GROBID:

1. Start the GROBID service using Docker:

```bash
npm run docker:up
```

This will start both DocGen and GROBID containers.

2. Run the tests with the E2E flag enabled:

```bash
RUN_E2E_TESTS=true npm test -- tests/paper_architect-e2e.test.ts
```

3. For regular unit tests that don't require GROBID:

```bash
npm test -- tests/paper_architect.test.ts
```

### Providing Real Paper PDFs for Testing

For more thorough testing with real papers, place academic paper PDFs in this directory and set the environment variable:

```bash
TEST_PAPER_PATH=/path/to/your/paper.pdf RUN_E2E_TESTS=true npm test -- tests/paper_architect-e2e.test.ts
```

Note: Real papers will likely have different structures than the test expectations, so tests may need to be adjusted accordingly.