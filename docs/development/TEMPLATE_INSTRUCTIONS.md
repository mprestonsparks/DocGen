# DocGen Template Instructions

This file provides instructions for users who have created a new repository from the DocGen template.

## First Steps After Creating Your Repository

1. **Clone your new repository**:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY if you want AI assistance
   ```

4. **Initialize the documentation for your project**:
   ```bash
   npm run interview
   ```

5. **Validate the generated documentation**:
   ```bash
   npm run validate
   ```

## Customizing Your Documentation

- **Templates**: Modify files in `docs/_templates/` to customize document formats
- **Config**: Adjust settings in `config/project-defaults.yaml` for default values
- **Tech Stacks**: Update `config/tech-stacks.json` with your preferred technologies

## GitHub Actions

The template includes several workflows:

- **Validation**: Automatically checks documentation structure and consistency
- **CI/CD**: Tests and updates badges for documentation status
- **Release**: Can be configured to publish documentation as releases

## Getting Help

If you encounter issues or have questions, please refer to:

- The full [DocGen Documentation](https://github.com/mprestonsparks/DocGen)
- Open an issue on the [DocGen repository](https://github.com/mprestonsparks/DocGen/issues)

## Next Steps

- Consider implementing a document hosting solution (GitHub Pages, etc.)
- Set up repository-specific documentation standards
- Customize the template to match your organization's needs