# DocGen Directory Structure

This document explains the organization of the DocGen project files and directories.

## Directory Structure

```
DocGen/
├── docs/                      # Documentation files
│   └── development/           # Developer-specific documentation
├── scripts/                   # Cross-platform scripts
│   ├── unix/                  # Unix-specific scripts (.sh)
│   └── windows/               # Windows-specific scripts (.ps1)
├── tests/                     # Test files and configurations
│   ├── reports/               # Test reports and summaries
│   └── utils/                 # Test utility scripts
├── .docker/                   # Docker configuration files
├── docgen.js                  # Main entry point
├── docgen.ps1                 # Windows wrapper (redirects to scripts/windows/)
├── docgen.sh                  # Unix wrapper (redirects to scripts/unix/)
├── get-to-work.ps1            # Windows workflow wrapper
├── get-to-work.sh             # Unix workflow wrapper
└── README.md                  # Project overview
```

## Directory Purposes

### `/docs`

Contains all documentation files for the project:

- `development/`: Documentation specifically for developers working on the DocGen project
  - Implementation details, architecture decisions, and development guidelines

### `/scripts`

Contains all scripts used for development, testing, and deployment:

- `unix/`: Unix-specific shell scripts (.sh)
  - `get-to-work.sh`: Main workflow manager for Unix systems
  - `docgen.sh`: Command runner for Unix systems
- `windows/`: Windows-specific PowerShell scripts (.ps1)
  - `get-to-work.ps1`: Main workflow manager for Windows systems
  - `docgen.ps1`: Command runner for Windows systems
- Cross-platform scripts (JavaScript):
  - `cross-platform.js`: Platform detection and script execution
  - `docker-run.js`: Docker container management

### `/tests`

Contains test-related files and utilities:

- `reports/`: Test execution reports and summaries
- `utils/`: Test utility scripts and helpers

### Root Directory

The root directory contains wrapper scripts that redirect to the platform-specific scripts in their respective directories. This maintains backward compatibility while allowing for better organization:

- `docgen.ps1` → `scripts/windows/docgen.ps1`
- `docgen.sh` → `scripts/unix/docgen.sh`
- `get-to-work.ps1` → `scripts/windows/get-to-work.ps1`
- `get-to-work.sh` → `scripts/unix/get-to-work.sh`

## Docker-First Approach

DocGen follows a Docker-first approach for cross-platform compatibility. The `.docker` directory contains all Docker-related configuration files, including:

- `Dockerfile`: Definition for the DocGen container
- `docker-compose.yml`: Service configuration for Docker Compose

## Cross-Platform Compatibility

The reorganized structure maintains cross-platform compatibility through:

1. Platform-specific scripts in dedicated directories
2. Wrapper scripts in the root directory for backward compatibility
3. Cross-platform JavaScript utilities for platform detection and script execution
4. Docker support for consistent execution across platforms

## Adding New Scripts

When adding new scripts to the project:

1. Place platform-specific scripts in the appropriate directory (`scripts/unix/` or `scripts/windows/`)
2. Update cross-platform utilities if necessary
3. Create wrapper scripts in the root directory if the script needs to be accessible directly

## Conclusion

This reorganized directory structure improves maintainability and clarity while preserving backward compatibility and cross-platform support. Developers can easily locate files based on their purpose and platform compatibility.
