# DocGen Docker Setup

This directory contains Docker configuration files for running DocGen in a containerized environment.

## Prerequisites

- Docker and Docker Compose installed on your system
- Basic understanding of Docker concepts

## Getting Started

1. Build and start the Docker container:

```bash
docker-compose -f .docker/docker-compose.yml up -d
```

2. Enter the running container:

```bash
docker-compose -f .docker/docker-compose.yml exec docgen bash
```

3. Inside the container, you can run DocGen commands:

```bash
npm run interview
npm run validate
npm run generate
```

## Environment Variables

If you want to use the LLM-enhanced features, you need to provide your Anthropic API key. There are two ways to do this:

1. Create a `.env` file in the project root with:

```
ANTHROPIC_API_KEY=your_api_key_here
```

2. Or, uncomment and modify the environment variable in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=development
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

And then run with:

```bash
ANTHROPIC_API_KEY=your_api_key_here docker-compose -f .docker/docker-compose.yml up -d
```

## Development Workflow

The project files are mounted as a volume, so any changes you make to the codebase will be immediately available inside the container.

## Stopping the Container

To stop the running container:

```bash
docker-compose -f .docker/docker-compose.yml down
```