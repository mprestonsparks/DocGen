# Fallback Templates

This directory contains fallback templates that are used when the primary Handlebars templates cannot be used or when there's an error processing them.

## Fallback Process

1. The system first tries to use Handlebars templates in the parent directory (`docs/_templates/*.hbs`)
2. If that fails, it looks for a markdown template in this directory (`docs/_templates/fallback/*.md`)
3. If no fallback template exists, the system will dynamically generate a basic template

## Template Structure

Fallback templates should maintain the same basic structure as the primary templates:

- YAML frontmatter with required metadata
- Consistent section organization
- Same document ID formats

## Adding New Fallback Templates

When adding a new document type to the system, consider creating a fallback template here to ensure consistent formatting if the primary template fails.

Supported document types:
- `prd.md` - Product Requirements Document
- `srs.md` - Software Requirements Specification
- `sad.md` - System Architecture Document
- `sdd.md` - Software Design Document
- `stp.md` - Software Test Plan
- `swift-sdd.md` - Swift Software Design Document