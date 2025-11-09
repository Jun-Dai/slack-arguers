# Contributing to Slack Debate System

This document outlines the development workflow and contribution guidelines.

## Development Workflow

### Branch Naming Convention

Due to technical constraints in this environment, all branches must follow this naming pattern:

```
claude/[feature-name]-[session-id]
```

Example: `claude/add-web-search-011CUwTMnjpdjaEzmCtveZhN`

### Creating a Feature Branch

1. **Start from main:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b claude/your-feature-name-sessionid
   ```

3. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. **Push to remote:**
   ```bash
   git push -u origin claude/your-feature-name-sessionid
   ```

5. **Create Pull Request:**
   - Go to GitHub repository
   - Click "Pull requests" → "New pull request"
   - Base: `main`, Compare: your feature branch
   - Fill out the PR template
   - Submit for review

## Pull Request Guidelines

### Before Submitting a PR

- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors
- [ ] Code is formatted: `npm run format`
- [ ] Documentation updated (if applicable)
- [ ] Tested locally or in dev environment

### PR Review Process

1. **Automated checks** will run (build, lint, Docker)
2. **Self-review** your changes in the GitHub UI
3. **Merge** when checks pass (currently no manual review required)

### After Merge

- Delete the feature branch (locally and remotely)
- Pull latest main: `git checkout main && git pull`

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define types for all function parameters and returns
- Avoid `any` types where possible
- Use meaningful variable and function names

### Code Organization

```
src/
├─> agent/          # AgentCore agent code
├─> lambda/         # Lambda function handlers
├─> services/       # Shared service code
├─> prompts/        # AI system prompts
└─> types/          # TypeScript type definitions
```

### Commit Messages

Follow conventional commits format:

```
feat: Add web search tool for debaters
fix: Resolve DynamoDB connection timeout
docs: Update setup guide with API Gateway steps
chore: Update dependencies
refactor: Simplify orchestrator logic
```

## Development Environments

### Local Development

```bash
# Install dependencies
npm install

# Build all workspaces
npm run build

# Watch for changes
npm run build && npm run watch
```

### Testing Changes

**Infrastructure:**
```bash
cd infrastructure
npm run cdk diff -- --context environment=dev
npm run cdk deploy -- --context environment=dev
```

**Agent Container:**
```bash
docker build -t slack-debate-agent:test .
docker run --rm slack-debate-agent:test
```

**Lambda Function:**
```bash
# Deploy via CDK or test locally
cd src/lambda
npm run build
```

## Common Tasks

### Adding a New Agent

1. Create agent class in `src/agent/agents/`
2. Add configuration in `src/agent/config/agent-configs.ts`
3. Create system prompt in `src/prompts/`
4. Update orchestrator to include new agent
5. Update types if needed

### Updating Infrastructure

1. Modify CDK constructs in `infrastructure/lib/`
2. Test with `cdk diff`
3. Deploy with `cdk deploy`
4. Update SETUP_GUIDE.md if setup steps change

### Adding New Dependencies

```bash
# For agent code
npm install --workspace=src/agent package-name

# For lambda code
npm install --workspace=src/lambda package-name

# For infrastructure
npm install --workspace=infrastructure package-name
```

## Debugging

### View Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/slack-debate-handler-dev --follow

# AgentCore logs
aws logs tail /aws/bedrock-agentcore/slack-debate-runtime-dev --follow
```

### Test Individual Components

```bash
# Test Lambda locally
aws lambda invoke \
  --function-name slack-debate-handler-dev \
  --payload file://test-event.json \
  response.json

# Check DynamoDB
aws dynamodb scan --table-name slack-debate-sessions-dev
```

## Resources

- [Architecture Plan](DEBATE_SYSTEM_PLAN.md) - System design and architecture
- [Setup Guide](SETUP_GUIDE.md) - Complete setup instructions
- [AWS CDK Docs](https://docs.aws.amazon.com/cdk/)
- [Bedrock AgentCore Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Slack API Docs](https://api.slack.com/)

## Getting Help

- Check CloudWatch logs for errors
- Review the troubleshooting section in SETUP_GUIDE.md
- Check AWS service status
- Review recent commits for similar changes
