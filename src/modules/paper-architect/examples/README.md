# Paper Architect Examples

This directory contains example files to help you use the paper_architect module effectively.

## Code Mapping Example

The `code-mapping.json` file demonstrates how to create mappings between paper elements and code implementations. This is used with the `update-trace` command to maintain traceability between the original paper and your implementation.

### Usage:

```bash
# Update traceability with your code implementation
npm run paper-architect -- update-trace -s YOUR_SESSION_ID -t path/to/your-mappings.json
```

### Structure:

Each mapping object requires:
- `paperElementId`: ID of the element from the paper (algo-1, concept-5, etc.)
- `codeElement`: Object describing the implementing code:
  - `id`: Unique identifier for the code element
  - `type`: Type of code element (class, function, method, etc.)
  - `name`: Name of the code element
  - `filePath`: Path to the file containing the implementation
  - `lineNumbers`: Start and end line numbers [start, end]
- `type`: Relationship type (implements, references, etc.)
- `confidence`: Confidence level (0.0-1.0) of the mapping
- `notes`: Optional notes about the implementation

## Creating Your Own Mappings

As you implement code from the paper:

1. Identify which paper element you're implementing
2. Create an entry in your mappings file
3. Run the update-trace command
4. Check the updated traceability visualization

For large implementations, you can automatically generate mappings by scanning your codebase for comments that reference paper elements.