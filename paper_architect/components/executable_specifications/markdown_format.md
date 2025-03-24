# Executable Markdown Specification

## Overview

Executable Markdown is a documentation format that combines traditional markdown descriptions with embedded executable code blocks. This approach enables both human-readable documentation and machine-verifiable specifications, making it ideal for implementing academic papers with high fidelity.

## Concepts

Inspired by the Ethereum Beacon Chain specification approach, executable markdown combines:

1. **Natural Language Descriptions** - Human-readable explanations of algorithms and methods
2. **Embedded Code Blocks** - Executable implementations that can be extracted and tested
3. **Test Fixtures** - Data sets used to verify implementation correctness
4. **Explicit Constants** - Named values defining key parameters of algorithms

## Format Specification

### Document Structure

An executable markdown document follows this general structure:

```
# Algorithm Name

## Description

[Natural language description of the algorithm]

## Constants

```python
# These constants define key parameters of the algorithm
MAX_ITERATIONS = 100
CONVERGENCE_THRESHOLD = 0.001
```

## Input/Output

```python
# Define input and output types
def algorithm_name(input_param1: type1, input_param2: type2) -> return_type:
    """
    Documentation for the function.
    
    Args:
        input_param1: Description
        input_param2: Description
        
    Returns:
        Description of return value
    """
    pass  # Implementation will replace this
```

## Algorithm Steps

### Step 1: [Description]

```python
def step_1(input_data):
    # Implementation of step 1
    result = process_data(input_data)
    return result
```

### Step 2: [Description]

```python
def step_2(step_1_result):
    # Implementation of step 2
    return final_result
```

## Complete Algorithm

```python
def algorithm_name(input_param1, input_param2):
    # Step 1: Process input data
    intermediate_result = step_1(input_param1)
    
    # Step 2: Generate final output
    final_result = step_2(intermediate_result, input_param2)
    
    return final_result
```

## Test Fixtures

```python
test_cases = [
    {
        "input": {"param1": value1, "param2": value2},
        "expected_output": expected_value
    },
    # Additional test cases...
]
```
```

### Code Block Types

Executable markdown uses specialized code blocks for different purposes:

1. **Definition Blocks**: Define constants, types, and function signatures
2. **Implementation Blocks**: Provide actual implementations of algorithms or steps
3. **Test Blocks**: Contain test fixtures and verification code
4. **Example Blocks**: Demonstrate usage examples (not executed during verification)

### Special Annotations

Code blocks can include special annotations to control how they're processed:

```python
# @executable: true|false
# @test: true|false
# @replace: block_id
# @depends: block_id1, block_id2
```

## Implementation Guidelines

### For Document Authors

1. **Start with Signatures**: Define function signatures and input/output types first
2. **Decompose Algorithms**: Break complex algorithms into logical steps
3. **Include Constants**: Define all constants used in the algorithm
4. **Add Test Fixtures**: Create comprehensive test cases to verify correctness
5. **Maintain Consistency**: Ensure code blocks align with natural language descriptions

### For Implementers

1. **Run Verification First**: Execute and verify the original specification
2. **Implement Incrementally**: Complete one code block at a time
3. **Run Tests Frequently**: Verify correctness after each implementation step
4. **Preserve Signatures**: Maintain function signatures as defined in the specification
5. **Document Changes**: Note any deviations from the original specification

## Extraction and Execution

The DocGen implementation includes tools to extract and execute code blocks:

```python
import re
import importlib.util
import sys
from pathlib import Path

class ExecutableMarkdownProcessor:
    """Process executable markdown documents."""
    
    def __init__(self, markdown_path, output_dir=None):
        """Initialize with path to markdown file and optional output directory."""
        self.markdown_path = Path(markdown_path)
        self.output_dir = Path(output_dir) if output_dir else self.markdown_path.parent / "generated"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Read the markdown content
        with open(markdown_path, 'r', encoding='utf-8') as f:
            self.content = f.read()
            
        # Extract code blocks
        self.code_blocks = self._extract_code_blocks()
        
    def _extract_code_blocks(self):
        """Extract Python code blocks from markdown."""
        pattern = r'```python\s+(.*?)\s+```'
        matches = re.finditer(pattern, self.content, re.DOTALL)
        
        blocks = []
        for i, match in enumerate(matches):
            block_content = match.group(1)
            # Check for annotations
            is_executable = not re.search(r'#\s*@executable:\s*false', block_content)
            is_test = bool(re.search(r'#\s*@test:\s*true', block_content))
            
            blocks.append({
                'id': f'block_{i}',
                'content': block_content,
                'executable': is_executable,
                'test': is_test
            })
            
        return blocks
    
    def generate_module(self, module_name='generated_module'):
        """Generate a Python module from the code blocks."""
        module_path = self.output_dir / f"{module_name}.py"
        
        with open(module_path, 'w', encoding='utf-8') as f:
            f.write("# Generated from executable markdown document\n")
            f.write(f"# Source: {self.markdown_path}\n\n")
            
            # Write non-test blocks first
            for block in [b for b in self.code_blocks if not b['test']]:
                f.write(f"# Block ID: {block['id']}\n")
                f.write(block['content'])
                f.write("\n\n")
            
            # Write test blocks
            f.write("# Test fixtures and functions\n")
            for block in [b for b in self.code_blocks if b['test']]:
                f.write(f"# Block ID: {block['id']}\n")
                f.write(block['content'])
                f.write("\n\n")
            
            # Add test runner
            f.write("# Test runner\n")
            f.write("if __name__ == '__main__':\n")
            f.write("    import unittest\n")
            f.write("    unittest.main()\n")
        
        return module_path
    
    def execute_tests(self, module_name='generated_module'):
        """Generate and execute tests from the markdown document."""
        module_path = self.generate_module(module_name)
        
        # Import the generated module
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        
        # Run the tests
        if hasattr(module, 'run_tests'):
            return module.run_tests()
        else:
            print("No test runner found in the generated module.")
            return False
```

## Example Usage

### Creating an Executable Markdown Document

```python
from docgen.paper_architect.executable_markdown import MarkdownGenerator

# Initialize the generator
generator = MarkdownGenerator("Knowledge Graph Expansion Algorithm")

# Add algorithm description
generator.add_description("""
This algorithm expands a knowledge graph by identifying potential new relationships
between entities based on existing connections and semantic similarity.
""")

# Add constants
generator.add_constants({
    "SIMILARITY_THRESHOLD": 0.75,
    "MAX_PATH_LENGTH": 3,
    "TOP_K_CANDIDATES": 10
})

# Add function signature
generator.add_function_signature(
    name="expand_knowledge_graph",
    params=[
        ("graph", "NetworkX Graph", "The knowledge graph to expand"),
        ("entity_embeddings", "Dict[str, np.ndarray]", "Entity embeddings")
    ],
    returns=("NetworkX Graph", "The expanded knowledge graph")
)

# Add algorithm steps
generator.add_step(
    title="Identify candidate relationships",
    code="""
    def identify_candidates(graph, entity_embeddings):
        candidates = []
        # Implementation details...
        return candidates
    """
)

# Generate the document
markdown = generator.generate()
with open("knowledge_graph_expansion.md", "w") as f:
    f.write(markdown)
```

### Extracting and Executing Code

```python
from docgen.paper_architect.executable_markdown import ExecutableMarkdownProcessor

# Initialize the processor
processor = ExecutableMarkdownProcessor("knowledge_graph_expansion.md")

# Generate a Python module
module_path = processor.generate_module("knowledge_graph_expansion")
print(f"Generated module at: {module_path}")

# Execute tests
test_results = processor.execute_tests()
print(f"All tests passed: {test_results}")
```

## Best Practices

1. **Provide Implementation Comments**: Include detailed comments explaining implementation choices
2. **Reference Paper Sections**: Link code blocks to specific sections in the original paper
3. **Highlight Algorithms**: Clearly identify key algorithms described in the paper
4. **Define Edge Cases**: Include test fixtures for boundary conditions and edge cases
5. **Use Type Annotations**: Include Python type hints for better documentation

## Integration with DocGen

Executable Markdown is a core component of the DocGen `paper_architect` module:

1. The **Paper Extraction** component identifies algorithms and methods
2. The **Knowledge Modeling** component structures this information
3. The **Executable Specification Generator** creates executable markdown documents
4. The **Verification System** extracts and executes code blocks to validate implementations

This integration enables a seamless workflow from paper to verified implementation.