# Effective Prompts for DocGen's AI

## Overview

This guide provides strategies and templates for effectively using DocGen's AI to implement academic papers with the DocGen `paper_architect` module. DocGen's AI is particularly well-suited for this task due to its ability to understand complex research concepts and generate implementation code that maintains fidelity to original papers.

## Principles for Effective Prompting

When working with DocGen's AI on academic paper implementations, follow these key principles:

1. **Provide Sufficient Context**: Include relevant paper excerpts, not just references
2. **Be Explicit About Fidelity**: Emphasize the importance of following the paper exactly
3. **Break Down Complex Tasks**: Request implementations of specific components, not entire papers
4. **Verify Implementations**: Ask DocGen's AI to verify its own implementations against paper descriptions
5. **Leverage Existing Tools**: Reference the DocGen modules and tools in your prompts

## Prompt Templates by Implementation Phase

### Phase 1: Paper Understanding

#### Template 1: Concept Clarification

```
I'm implementing the paper [PAPER TITLE] and need to understand a concept.

Here's the excerpt from Section [X.Y]:

"""
[PASTE PAPER EXCERPT]
"""

Please help me understand:
1. What this concept means in simple terms
2. How it relates to other concepts in the paper
3. Any prerequisites or background knowledge needed
4. Potential implementation challenges

I'm using DocGen's `paper_architect` module, so please frame your explanation in terms that will help with implementation.
```

#### Template 2: Algorithm Breakdown

```
I'm working with a paper on [TOPIC] and need to break down this algorithm:

"""
[PASTE ALGORITHM FROM PAPER]
"""

Please help me:
1. Identify the inputs and outputs with their types
2. Break down the algorithm into clear, sequential steps
3. Identify any mathematical operations or special functions needed
4. Explain any notation that might be unclear

My goal is to create an executable specification using DocGen's format.
```

### Phase 2: Knowledge Modeling

#### Template 3: Schema Creation

```
I need to create a knowledge schema for this paper on [TOPIC]:

[PAPER TITLE AND BRIEF DESCRIPTION]

I've already processed the paper with GROBID and have this structured data:
```json
[PASTE SAMPLE OF STRUCTURED PAPER DATA]
```

Please help me create a schema that captures:
1. The key algorithms in the paper
2. Important methods and techniques
3. Data structures and their relationships
4. Parameters and constants

This schema will be used by DocGen's Knowledge Modeling System to create an implementation plan.
```

#### Template 4: Ontology Mapping

```
I'm mapping concepts from this paper to a computer science ontology:

[PAPER REFERENCE]

Here are the key concepts I've identified:
- [CONCEPT 1]
- [CONCEPT 2]
- [CONCEPT 3]

Please help me:
1. Map these concepts to standard computer science ontology terms
2. Identify any relationships between these concepts
3. Suggest any additional concepts that might be implied but not explicitly mentioned
4. Note any domain-specific terminology that might need special attention

This mapping will be used in DocGen's traceability system.
```

### Phase 3: Implementation Planning

#### Template 5: Dependency Analysis

```
I'm planning the implementation of this paper's algorithms:

[PAPER TITLE]

Here are the components I've identified:
- [COMPONENT 1]: [BRIEF DESCRIPTION]
- [COMPONENT 2]: [BRIEF DESCRIPTION]
- [COMPONENT 3]: [BRIEF DESCRIPTION]

Please help me:
1. Identify dependencies between these components
2. Suggest an optimal implementation order
3. Highlight any components that might be particularly challenging
4. Recommend a testing strategy for each component

I'm using DocGen's Implementation Workflow to guide this process.
```

#### Template 6: Library Selection

```
I'm implementing algorithms from this paper:

[PAPER TITLE AND REFERENCE]

Key requirements:
- [REQUIREMENT 1]
- [REQUIREMENT 2]
- [REQUIREMENT 3]

Please recommend:
1. The most appropriate Python libraries for this implementation
2. Any specific functions or classes within these libraries that align with the paper's methods
3. Alternative libraries if the primary recommendations have limitations
4. Any performance considerations for these libraries

I'll be using these with DocGen's implementation templates.
```

### Phase 4: Implementation

#### Template 7: Algorithm Implementation

```
I need to implement this algorithm from Section [X.Y] of the paper:

"""
[PASTE ALGORITHM DESCRIPTION]
"""

Some key details:
- Input: [DESCRIBE INPUT]
- Output: [DESCRIBE OUTPUT]
- This is part of the [COMPONENT NAME] component
- It depends on [LIST DEPENDENCIES]

Please provide:
1. Python code implementing this algorithm exactly as described
2. Detailed comments that reference specific parts of the paper
3. Type hints and docstrings following DocGen standards
4. Paper reference annotations (@paper_reference)

The implementation should prioritize fidelity to the paper over optimization.
```

#### Template 8: Executable Specification Creation

```
I need to create an executable specification for this method from the paper:

"""
[PASTE METHOD DESCRIPTION]
"""

Please format this as DocGen executable markdown with:
1. A clear description section matching the paper's explanation
2. Constants section with all required parameters
3. Input/output section with type definitions
4. Step-by-step algorithm breakdown with code blocks
5. Test fixtures based on examples from the paper

This specification will be used both as documentation and for verification.
```

### Phase 5: Verification

#### Template 9: Implementation Verification

```
I've implemented this algorithm from the paper:

"""
[PASTE ORIGINAL ALGORITHM FROM PAPER]
"""

Here's my implementation:

```python
[PASTE IMPLEMENTATION CODE]
```

Please verify:
1. Does the implementation correctly follow the paper's algorithm?
2. Are there any edge cases that aren't handled properly?
3. Do the variable names and mathematical operations match the paper's notation?
4. Are there any optimizations that could be made while maintaining fidelity?

This is for DocGen's verification system, so please be thorough in your analysis.
```

#### Template 10: Test Case Generation

```
I need test cases for this algorithm implemented from the paper:

"""
[PASTE ALGORITHM DESCRIPTION]
"""

Here's my implementation:

```python
[PASTE IMPLEMENTATION CODE]
```

Please provide:
1. A comprehensive set of test cases covering normal operation
2. Edge cases that might cause problems
3. Test cases matching examples from the paper
4. Any additional test cases needed for full coverage

Format these as pytest test cases compatible with DocGen's verification framework.
```

## Step-by-Step Implementation with DocGen's AI

### Step 1: Set Up the Framework

```
I'm starting an implementation of [PAPER TITLE] using DocGen's `paper_architect` module. Please help me set up the initial project structure:

1. Create a basic folder structure following DocGen's conventions
2. Generate a requirements.txt file with necessary dependencies
3. Create a basic README.md explaining the project
4. Set up the initial configuration for GROBID integration

I'll be using Python and following the DocGen implementation workflow.
```

### Step 2: Process the Paper

```
I've processed my paper with GROBID and have the structured output. Please help me understand what I'm looking at and how to use it:

```json
[PASTE SMALL SAMPLE OF GROBID OUTPUT]
```

Specifically:
1. What are the most important elements in this output?
2. How should I extract algorithms and methods?
3. What might be missing that I need to add manually?
4. How can I convert this to DocGen's knowledge schema format?
```

### Step 3: Create the Knowledge Model

```
Based on the paper analysis, I need to create a knowledge model for implementation. Here are the key components:

[LIST KEY COMPONENTS]

For each component, please help me create:
1. A formal definition matching the paper
2. Input and output specifications
3. Dependencies on other components
4. Any special considerations for implementation

This model will guide the entire implementation process, so it needs to be comprehensive.
```

### Step 4: Generate Executable Specifications

```
I need to create executable specifications for these algorithms:

1. [ALGORITHM 1]
2. [ALGORITHM 2]
3. [ALGORITHM 3]

Here's the description of [ALGORITHM 1] from the paper:

"""
[PASTE ALGORITHM DESCRIPTION]
"""

Please create a complete executable markdown specification following DocGen's format, including:
1. Description section
2. Constants section
3. Input/output definitions
4. Step-by-step breakdown with code blocks
5. Test fixtures

Once I approve this, we'll move on to the other algorithms.
```

### Step 5: Implement Core Components

```
I'm ready to implement [COMPONENT NAME] based on this executable specification:

"""
[PASTE EXECUTABLE SPECIFICATION]
"""

Please provide:
1. A complete Python implementation following the specification exactly
2. Unit tests verifying the implementation
3. Documentation with paper references
4. Integration notes for connecting with other components

This implementation should prioritize correctness and paper fidelity over performance optimization.
```

### Step 6: Verify Implementation

```
I've completed the implementation of [COMPONENT] and need to verify it against the paper. Here's the implementation:

```python
[PASTE IMPLEMENTATION]
```

And here's the relevant section from the paper:

"""
[PASTE PAPER SECTION]
"""

Please perform a detailed verification:
1. Does each step in the implementation match the paper?
2. Are mathematical operations implemented correctly?
3. Are there any discrepancies or potential issues?
4. What additional tests would verify paper fidelity?

This verification will be added to DocGen's traceability matrix.
```

## Special Case Prompts

### Handling Ambiguities

```
I've encountered an ambiguity in the paper. Section [X.Y] describes:

"""
[PASTE AMBIGUOUS DESCRIPTION]
"""

But it's unclear how to implement it because:
[EXPLAIN AMBIGUITY]

Please help me:
1. Interpret what the authors likely meant
2. Propose multiple possible implementations
3. Suggest how to test which interpretation is correct
4. Recommend how to document this ambiguity in the code

I need to make a decision on how to proceed with the implementation.
```

### Mathematical Notation

```
I need help implementing this mathematical formula from the paper:

"""
[PASTE FORMULA]
"""

The notation includes:
- [EXPLAIN NOTATION ELEMENT 1]
- [EXPLAIN NOTATION ELEMENT 2]

Please:
1. Explain the formula in plain English
2. Translate it to Python code that exactly matches the mathematical operations
3. Note any potential numerical stability issues
4. Provide a simple test case with expected output

The formula is used in the [COMPONENT NAME] component.
```

### Cross-Language Implementation

```
The paper describes an algorithm that would be best implemented in Python, but my existing codebase is in TypeScript. I need to:

1. Implement the [ALGORITHM NAME] algorithm in Python
2. Create a FastAPI endpoint to expose this functionality
3. Develop a TypeScript client to call this endpoint

Here's the algorithm from the paper:

"""
[PASTE ALGORITHM]
"""

Please provide:
1. The Python implementation with FastAPI endpoint
2. TypeScript client code to call this endpoint
3. Any necessary data conversion between the languages
4. Testing approach for the cross-language implementation
```

## Integration with DocGen Traceability

```
I've implemented several components from the paper and need to update the traceability matrix. Here are the components:

1. [COMPONENT 1]: Implemented in [FILE PATH]
2. [COMPONENT 2]: Implemented in [FILE PATH]
3. [COMPONENT 3]: Implemented in [FILE PATH]

Please help me:
1. Create paper reference annotations for each component
2. Generate traceability entries linking code to paper sections
3. Update the implementation status for each component
4. Identify any paper elements that still need implementation

I'm using DocGen's Traceability Matrix Builder for this task.
```

## Best Practices for Working with DocGen's AI

### Providing Context

- Include full algorithm descriptions, not just summaries
- Reference specific paper sections and page numbers
- Provide surrounding context for formulas and methods
- Include examples from the paper whenever available

### Breaking Down Complex Implementations

- Request implementations one component at a time
- For complex algorithms, break into steps and implement each step
- Get intermediate verification before proceeding to the next component
- Use the bottom-up approach from DocGen's workflow

### Maintaining Consistency

- Use consistent terminology across prompts
- Reference previous components by exact names
- Maintain the same variable naming conventions
- Keep a session log to reference previous decisions

### Handling Implementation Challenges

- When stuck, provide detailed information about the roadblock
- Include multiple attempts or approaches you've tried
- Ask for step-by-step reasoning, not just solutions
- Request alternative approaches when one method fails

## Troubleshooting Prompt Issues

### Problem: Implementations Deviate from Paper

If DocGen's AI produces implementations that don't match the paper:

1. Check if you provided the complete algorithm description
2. Emphasize that paper fidelity is the priority
3. Compare the implementation with the paper point-by-point
4. Ask Claude to explain its implementation decisions

### Problem: Missing Implementation Details

If implementations are missing key details:

1. Ask Claude to identify what's missing
2. Provide additional context from the paper
3. Request a more verbose implementation with comments
4. Break down the implementation into smaller steps

### Problem: Integration Difficulties

If components don't integrate well:

1. Clearly define the interfaces between components
2. Share the implementation of dependent components
3. Ask Claude to create adapter code
4. Request an integration test that verifies component interaction

## Conclusion

Effective prompting strategies can significantly enhance DocGen's AI's ability to implement academic papers faithfully. By providing clear context, breaking down complex tasks, and systematically verifying implementations, you can leverage DocGen's AI's capabilities within the DocGen `paper_architect` framework.

Remember that the goal is not just working code, but code that faithfully implements the research described in the paper. Each prompt should emphasize this fidelity while providing DocGen's AI with the information it needs to understand and implement complex research concepts.

The templates and strategies in this guide should be adapted to your specific paper and implementation needs, but the core principles of context, clarity, and verification remain essential regardless of the specific research being implemented.