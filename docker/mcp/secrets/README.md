# MCP Server Secret Management

This directory contains sensitive API keys and tokens required by the MCP servers. 

## Security Warning

**IMPORTANT: Never commit these files to version control!**

This directory should be added to your `.gitignore` file to prevent accidental commits of sensitive information.

## Required Secret Files

The following secret files should be created in this directory:

1. `github_token.txt` - GitHub API token for repository access
2. `anthropic_key.txt` - Anthropic API key for AI capabilities

## File Format

Each file should contain only the API key or token, with no additional formatting or whitespace.

Example:
```
your_api_key_here
```

## Permissions

For security reasons, these files should have restricted permissions:

- Directory permissions: 700 (only owner can read, write, execute)
- File permissions: 600 (only owner can read and write)

The Python setup script (`mcp_server_setup.py`) will automatically set these permissions when creating the files.

## Secret Rotation

For enhanced security, consider rotating these secrets regularly. When rotating secrets:

1. Update the secret file with the new key/token
2. Restart the MCP servers to apply the changes:
   ```bash
   python ../../scripts/python/mcp_server_setup.py stop
   python ../../scripts/python/mcp_server_setup.py start
   ```

## Docker Secret Management

These files are mounted as Docker secrets in the MCP containers, making them accessible only to the specific services that require them. The secrets are mounted as read-only files in the `/run/secrets/` directory within each container.
