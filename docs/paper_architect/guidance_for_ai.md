# Instructions for Claude Code or Cascade AI: paper_architect Module

## IMPORTANT DISCLAIMER
**All files in this module were generated by an AI assistant (Claude). They represent a starting point based on research, not definitive requirements. You should interpret and adapt these materials as needed to best achieve the project's goals. Feel free to question assumptions, propose alternatives, or recommend improvements to any aspect of the design.**

## Overview

The `paper_architect` module is an extension to the existing DocGen project, designed to help implement academic papers as software by generating structured planning documentation. This documentation integrates seamlessly with DocGen's current capabilities and can be used by AI coding assistants to implement papers with high fidelity to the original research.

## Module Purpose

The module addresses a key challenge: maintaining fidelity to academic research papers during implementation, especially when:
- The paper describes complex algorithms
- Architecture changes occur mid-implementation
- Multiple collaborators need a shared understanding of the paper

The primary goal is to create structured documentation that:
1. Represents the paper's content in a machine-readable format
2. Establishes bidirectional traceability between paper concepts and code
3. Creates executable specifications that verify implementation correctness
4. Guides developers through a systematic implementation process
5. **Integrates with and enhances DocGen's existing documentation generation capabilities**

## Integration with Existing DocGen System

This module **must be designed as an extension of DocGen**, not a standalone system. Specifically:

- **Reuse existing DocGen components** wherever possible rather than reimplementing functionality
- **Follow DocGen's established patterns** for document generation, file handling, and user interaction
- **Extend DocGen's data models** to accommodate academic paper implementation needs
- **Leverage DocGen's existing traceability matrices** and planning documentation frameworks
- **Ensure new functionality complements** the existing DocGen workflow
- **Maintain compatibility** with DocGen's current interface and API structure
- **Use the same coding standards** and architectural approaches as the rest of DocGen

## Contents of the Module

The `paper_architect` module contains several key components that extend DocGen's functionality:

1. **Paper Extraction Engine**
   - Integrates with GROBID to extract structured information from PDFs
   - Converts academic papers into structured JSON format compatible with DocGen's document model
   - Identifies algorithms, methods, equations, and key concepts

2. **Knowledge Modeling System**
   - Creates formal representations of paper concepts
   - Maps relationships between concepts within DocGen's existing relationship framework
   - Structures paper information using computer science ontologies

3. **Executable Specification Generator**
   - Extends DocGen's documentation generation to include embedded executable code
   - Enables verification through execution
   - Documents algorithms in human and machine-readable formats

4. **Traceability Matrix Builder**
   - Extends DocGen's existing traceability functionality to paper concepts
   - Visualizes implementation completeness
   - Tracks development progress within DocGen's workflow

5. **Implementation Workflow Engine**
   - Guides bottom-up implementation approach
   - Creates staged implementation plans consistent with DocGen's planning documentation
   - Provides verification strategies

## Next Steps

As Claude Code, you'll be helping to:

1. Implement the core components of the `paper_architect` module as extensions to DocGen
2. Set up the necessary file structure and dependencies that follow DocGen's architecture
3. Integrate deeply with the existing DocGen codebase and functionality
4. Add functionality iteratively, starting with the most critical components
5. Ensure backward compatibility with existing DocGen features

## Development Priorities

When working on this module, prioritize:

1. **Integration with existing DocGen components** - Use and extend what's already there
2. **Correctness over completeness** - Start with core functionality
3. **Usability for DocGen users** - Keep interfaces consistent with existing DocGen patterns
4. **Flexibility in paper interpretation** - Design for ambiguity in papers

## Technical Approach

The module should be implemented in Python, consistent with DocGen's existing architecture. Key dependencies include:
- GROBID for PDF processing
- NetworkX for knowledge representation
- Standard Python libraries for file operations and data transformation
- **DocGen's existing libraries and utilities**

Use test-driven development where possible, creating tests alongside implementation code that follow DocGen's testing patterns.

## Communication Guidelines

When you need clarification or have suggestions:
- Present multiple options when appropriate
- Explain trade-offs clearly
- Reference specific sections of the design documents
- Suggest improvements to the design when you see opportunities
- **Highlight any potential conflicts or integration challenges with the existing DocGen system**

Feel free to challenge assumptions in the design if you believe there are better approaches to integrate with DocGen's existing functionality.