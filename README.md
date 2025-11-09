# Slack Debate System

A multi-persona AI debate system for Slack using Amazon Bedrock AgentCore, featuring automated debates between AI agents with fact-checking and summarization.

## Overview

This system orchestrates structured debates in Slack using five AI personas:

- **C-3PO** (Orchestrator) - Welcomes participants, manages debate flow
- **Sonny** (Debater 1) - Philosophical, analytical debater
- **Ava** (Debater 2) - Strategic, persuasive debater
- **K-9** (Fact-Checker) - Verifies claims with authoritative sources
- **GERTY** (Summariser) - Provides impartial debate analysis

## Architecture

Built on AWS using:
- **Amazon Bedrock AgentCore** - Multi-agent orchestration with managed memory
- **AWS Lambda** - Slack event handling
- **DynamoDB** - Debate state management
- **AWS CDK** - Infrastructure as Code
- **GitHub Actions** - CI/CD

## Project Structure

```
slack-arguers/
├── infrastructure/         # CDK infrastructure code
│   ├── lib/
│   │   ├── slack-debate-stack.ts
│   │   ├── agentcore-constructs.ts
│   │   ├── lambda-constructs.ts
│   │   ├── database-constructs.ts
│   │   └── secrets-constructs.ts
│   └── bin/app.ts
├── src/
│   ├── agent/             # AgentCore agent implementations
│   │   ├── agents/        # Individual agent classes
│   │   ├── tools/         # Web search and other tools
│   │   ├── config/        # Agent configurations
│   │   ├── orchestrator.ts
│   │   └── index.ts       # AgentCore entrypoint
│   ├── lambda/            # Slack event handler
│   │   └── slack-handler.ts
│   ├── prompts/           # System prompts for each persona
│   └── types/             # TypeScript type definitions
├── Dockerfile             # AgentCore Runtime container
└── DEBATE_SYSTEM_PLAN.md  # Detailed architecture plan
```

## Prerequisites

1. **AWS Account** with:
   - Bedrock AgentCore enabled
   - Claude 3.5 Sonnet and Haiku model access
   - Services: Lambda, DynamoDB, Secrets Manager, ECR

2. **Slack Workspaces** (test and production) with:
   - Three Slack apps configured (C-3PO, Sonny, Ava)
   - Bot tokens stored in AWS Secrets Manager

3. **GitHub** with:
   - OIDC provider configured in AWS
   - Repository secrets for deployment

## Setup

### 1. AWS Configuration

```bash
# Configure AWS credentials
aws configure

# Enable Bedrock model access (via AWS Console)
# - Go to Bedrock console
# - Request access to Claude 3.5 Sonnet
# - Request access to Claude 3.5 Haiku

# Enable AgentCore (via AWS Console)
# - Go to Bedrock > AgentCore
# - Enable Runtime and Memory services
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Slack Apps

See `DEBATE_SYSTEM_PLAN.md` for detailed Slack app configuration instructions.

### 4. Store Slack Tokens in Secrets Manager

```bash
# After deploying the CDK stack, update the secrets:
aws secretsmanager put-secret-value \
  --secret-id /slack-debate/dev/bot-tokens/c3po \
  --secret-string "xoxb-your-token-here"

aws secretsmanager put-secret-value \
  --secret-id /slack-debate/dev/bot-tokens/sonny \
  --secret-string "xoxb-your-token-here"

aws secretsmanager put-secret-value \
  --secret-id /slack-debate/dev/bot-tokens/ava \
  --secret-string "xoxb-your-token-here"
```

## Development

### Local Development

```bash
# Build all workspaces
npm run build

# Build and watch for changes
npm run build && npm run watch

# Lint code
npm run lint

# Format code
npm run format
```

### Deploy to Development

```bash
# Deploy via GitHub Actions (push to main/develop)
git push origin main

# Or deploy manually
npm run deploy:dev
```

### Deploy to Production

```bash
# Create a release tag
git tag v0.1.0
git push origin v0.1.0

# Or deploy manually
npm run deploy:prod
```

## Usage

In a Slack channel where the C-3PO bot is installed:

```
@C-3PO debate: Should artificial intelligence be regulated?
```

The system will:
1. Assign debate positions to Sonny and Ava
2. Facilitate opening statements and rebuttals
3. Monitor for circular arguments or impasse
4. Call for closing statements
5. Fact-check claims (K-9)
6. Provide summary analysis (GERTY)

## Configuration

Agent configurations are in `src/agent/config/agent-configs.ts`:

- Model selection (Sonnet vs Haiku)
- Temperature settings
- Token limits
- System prompts
- Tool availability

## Cost Estimates

For moderate use (20 debates/month):
- Infrastructure: $6-15/month
- Bedrock AgentCore: $1-6/month
- Bedrock Models: $9/month
- **Total: ~$17-35/month**

See `DEBATE_SYSTEM_PLAN.md` for detailed cost breakdown.

## Monitoring

- AgentCore Observability dashboard (via AWS Console)
- Lambda logs in CloudWatch
- DynamoDB metrics

## Security

- IAM-based authentication (no API keys)
- Secrets Manager for Slack tokens
- VPC connectivity support
- Encryption at rest (DynamoDB, Secrets Manager)

## Contributing

This is a personal project. See `DEBATE_SYSTEM_PLAN.md` for implementation roadmap.

## License

Private project.
