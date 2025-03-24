# Improved Testing Architecture for DocGen Extraction Module

## Current Issues

1. **Excessive Test Output**: Jest produces voluminous output that's difficult to process
2. **Coverage Measurement Challenges**: Determining accurate coverage is difficult due to output limitations
3. **Test Runtime Efficiency**: Running full test suite is slow and resource-intensive
4. **Cross-Module Dependencies**: Extraction module has numerous external dependencies
5. **Targeted Testing Complexity**: Identifying and targeting untested code paths is challenging

## Proposed Architecture Improvements

### 1. Modular Test Structure

```
tests/paper_architect/extraction/
├── unit/                    # Fine-grained isolated unit tests
│   ├── pdf-handling.test.ts # Tests for PDF file handling specifically
│   ├── xml-parsing.test.ts  # Tests for XML parsing functions
│   ├── llm-integration.test.ts  # Tests for LLM enhancement
│   └── error-handling.test.ts   # Tests for error conditions
├── integration/             # Tests for component integration
│   ├── grobid-workflow.test.ts  # End-to-end GROBID workflow
│   └── llm-workflow.test.ts     # End-to-end LLM workflow
├── mocks/                   # Shared mock implementations
│   ├── fs-mock.ts           # File system mocks
│   ├── http-mock.ts         # HTTP request mocks
│   └── llm-mock.ts          # LLM API mocks
└── fixtures/                # Test data fixtures
    ├── sample-tei.xml       # Sample TEI XML for testing
    └── sample-paper.json    # Sample paper data structure
```

### 2. Testing Strategy by Layer

1. **Core Functions Layer**: Test individual pure functions with unit tests
   - XML parsing functions
   - Data transformation functions
   - Helper utilities
   
2. **Integration Layer**: Test combinations of functions with external dependencies mocked
   - GROBID processing workflow
   - LLM enhancement workflow
   - File type handling
   
3. **Boundary Layer**: Test error conditions and edge cases
   - Network failures
   - Malformed inputs
   - Resource limitations

### 3. Dependency Injection

Refactor the extraction module to use dependency injection:

```typescript
// Before
export async function extractPaperContent(paperFilePath: string, options?: ExtractionOptions) {
  // Direct dependencies
  const fileExists = fs.existsSync(paperFilePath);
  // ...
}

// After
export async function extractPaperContent(
  paperFilePath: string, 
  options?: ExtractionOptions,
  dependencies = {
    fileSystem: fs,
    httpClient: http,
    llmClient: llm
  }
) {
  // Injected dependencies
  const fileExists = dependencies.fileSystem.existsSync(paperFilePath);
  // ...
}
```

### 4. Test Runner Enhancements

1. **Focused Test Commands**:

```json
"scripts": {
  "test:extraction:unit": "jest 'tests/paper_architect/extraction/unit/.*\\.test\\.ts$'",
  "test:extraction:integration": "jest 'tests/paper_architect/extraction/integration/.*\\.test\\.ts$'",
  "test:extraction:core": "jest -t 'Core functionality'",
  "test:extraction:error": "jest -t 'Error handling'"
}
```

2. **Customized Coverage Reporter**:

Create a custom coverage reporter that outputs only the relevant information:

```js
// scripts/coverage-reporter.js
class CustomCoverageReporter {
  onRunComplete(contexts, results) {
    const coverage = results.coverageMap;
    const extractionModule = Object.keys(coverage).find(key => 
      key.includes('paper_architect/extraction/index'));
    
    if (extractionModule) {
      const moduleCoverage = coverage[extractionModule];
      console.log('\n=== EXTRACTION MODULE COVERAGE ===');
      console.log(`Statements: ${this.getPercentage(moduleCoverage.statementMap, moduleCoverage.s)}%`);
      console.log(`Branches: ${this.getPercentage(moduleCoverage.branchMap, moduleCoverage.b)}%`);
      console.log(`Functions: ${this.getPercentage(moduleCoverage.fnMap, moduleCoverage.f)}%`);
      
      // List uncovered functions if any
      const uncoveredFns = this.getUncoveredItems(moduleCoverage.fnMap, moduleCoverage.f);
      if (uncoveredFns.length > 0) {
        console.log('\nUncovered Functions:');
        uncoveredFns.forEach(fn => console.log(`- ${fn.name} (line ${fn.line})`));
      }
    }
  }
  
  getPercentage(map, coverage) {
    const total = Object.keys(map).length;
    const covered = Object.keys(coverage).filter(k => coverage[k] > 0).length;
    return total === 0 ? 100 : Math.round((covered / total) * 100);
  }
  
  getUncoveredItems(map, coverage) {
    return Object.keys(map)
      .filter(k => coverage[k] === 0)
      .map(k => ({
        name: map[k].name || `Item ${k}`,
        line: map[k].loc?.start?.line || 'unknown'
      }));
  }
}
```

### 5. Module Refactoring for Testability

1. **Smaller, Pure Functions**:
   - Break down large functions into smaller, pure functions
   - Extract complex logic into separate testable components

2. **Explicit Interface Boundaries**:
   - Create explicit interfaces for dependencies
   - Separate core logic from I/O and external services

```typescript
// interfaces.ts
export interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: string): string;
  // ...
}

export interface HttpClient {
  request(url: string, options: any, callback: Function): any;
  // ...
}

// extraction-core.ts - Pure business logic
export function parseXmlContent(xmlContent: string): PaperContent {
  // Pure function, easily testable
}

// extraction-io.ts - I/O operations
export async function fetchGrobidContent(
  paperFilePath: string, 
  options: any,
  httpClient: HttpClient
): Promise<string> {
  // I/O operations with injected dependencies
}

// index.ts - Main API that composes everything
export async function extractPaperContent(
  paperFilePath: string,
  options?: ExtractionOptions,
  deps = { fs: realFs, http: realHttp }
): Promise<PaperContent> {
  const xmlContent = await fetchGrobidContent(paperFilePath, options, deps.http);
  return parseXmlContent(xmlContent);
}
```

### 6. Test Data Management

1. **Fixture Generation**:
   - Create programmatic fixture generators for test data
   - Parameterize tests to run with different fixture variations

```typescript
// fixtures/generator.ts
export function generateTeiXml(options = {}) {
  const { title = 'Test Paper', authors = ['Test Author'] } = options;
  
  return `
    <TEI>
      <teiHeader>
        <fileDesc>
          <titleStmt><title>${title}</title></titleStmt>
          <sourceDesc>
            <biblStruct>
              <analytic>
                ${authors.map(author => `
                  <author>
                    <persName>
                      <forename type="first">${author.split(' ')[0]}</forename>
                      <surname>${author.split(' ')[1]}</surname>
                    </persName>
                  </author>
                `).join('')}
              </analytic>
            </biblStruct>
          </sourceDesc>
        </fileDesc>
      </teiHeader>
      <!-- Additional content can be added based on options -->
    </TEI>
  `;
}
```

### 7. Code Coverage Strategy

1. **Component-Level Coverage**:
   - Track coverage by logical component rather than files
   - Set coverage thresholds by importance of component

2. **Coverage-Driven Test Generation**:
   - Create a script that identifies uncovered branches
   - Generate targeted tests for those specific branches

```typescript
// scripts/generate-targeted-tests.js
function generateTestsForUncoveredBranches(coverageData) {
  const uncoveredBranches = findUncoveredBranches(coverageData);
  
  uncoveredBranches.forEach(branch => {
    const testContent = createTestForBranch(branch);
    writeTestFile(`tests/targeted/${branch.functionName}-branch-${branch.id}.test.ts`, testContent);
  });
}
```

## Implementation Plan

1. **First Phase: Restructure Tests**
   - Create the folder structure for modular tests
   - Move existing tests into appropriate categories
   - Create shared mocks and fixtures

2. **Second Phase: Refactor Extraction Module**
   - Introduce dependency injection
   - Break down large functions
   - Create explicit interfaces

3. **Third Phase: Implement Custom Tooling**
   - Develop custom coverage reporter
   - Create coverage-driven test generator
   - Enhance test runner scripts

4. **Fourth Phase: Implement New Tests**
   - Add unit tests for core functions
   - Add integration tests for workflows
   - Add boundary tests for error conditions

## Benefits

1. **Improved Reproducibility**: Tests will be more consistent and reliable
2. **Better Isolation**: Unit tests won't be affected by external dependencies
3. **Faster Execution**: Can run only relevant test subsets
4. **More Accurate Coverage**: Better understanding of what's actually covered
5. **Easier Maintenance**: Clearer structure makes tests easier to maintain
6. **More Targeted Testing**: Focus on important components and edge cases