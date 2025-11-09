# Slack Debate System - Architecture Plan

## Overview

A multi-persona AI debate system for Slack that orchestrates structured debates between AI agents, complete with fact-checking and summarisation. The system will run on AWS using a combination of Lambda functions and AgentCore infrastructure.

## System Personas

### C-3PO (Orchestrator) 🤖
**Identity:** Primary Slack bot identity
**Role:** Debate moderator and host
**Personality:** Welcoming, hospitable, diplomatic - keeps debates lively but focused, prevents circular arguments
**Language:** British English
**Capabilities:**
- Constructs system prompts for debaters based on the proposition
- Determines debate parameters and structure
- Monitors debate progress and calls for closing statements
- Manages debate flow and round limits

### Sonny (Debater 1) 🤖
**Identity:** Dedicated Slack bot identity
**Role:** First debater (assigned position by orchestrator)
**Personality:** Philosophical, analytical, principled - argues from first principles
**Language:** No restriction
**Capabilities:**
- Web search (bias towards blogs and articles)
- Opening statements (200 words max)
- Rebuttals and follow-ups (150 words max)

### Ava (Debater 2) 🤖
**Identity:** Dedicated Slack bot identity
**Role:** Second debater (assigned opposing position by orchestrator)
**Personality:** Strategic, persuasive, adaptive - argues with rhetorical sophistication
**Language:** No restriction
**Capabilities:**
- Web search (bias towards blogs and articles)
- Opening statements (200 words max)
- Rebuttals and follow-ups (150 words max)

### K-9 (Fact-Checker) 📋
**Identity:** Uses C-3PO's Slack bot (signs messages as "—K-9")
**Role:** Post-debate fact verification
**Personality:** Precise, bureaucratic, legalistic - concise and to-the-point
**Language:** British English
**Capabilities:**
- Web search (bias towards Wikipedia and authoritative sources)
- Identifies falsehoods, stretched truths, and unverifiable claims
- Provides citations for fact-checks

### GERTY (Summariser) 📊
**Identity:** Uses C-3PO's Slack bot (signs messages as "—GERTY")
**Role:** Post-debate analysis and summary
**Personality:** Fair-minded, intellectually honest, rigorously impartial - seeks truth over politeness
**Language:** British English
**Capabilities:**
- Synthesises main arguments (excluding fact-checked falsehoods)
- Provides balanced summary opinion on the proposition
- Identifies cognitive biases and logical fallacies

## Debate Flow

```
1. User summons C-3PO in Slack channel
   └─> "@C-3PO debate: [proposition]"

2. C-3PO responds in thread
   ├─> Introduces the debate topic
   ├─> Assigns positions (Sonny: For, Ava: Against, or vice versa)
   ├─> Describes each debater's persona
   └─> Sets parameters (rounds, word limits, structure)

3. Opening Statements (200 words each)
   ├─> Debater 1 (e.g., Sonny): Opening statement for their position
   └─> Debater 2 (e.g., Ava): Opening statement for their position

4. Debate Rounds (150 words each)
   ├─> Debater 1: Rebuttal and arguments
   ├─> Debater 2: Rebuttal and arguments
   ├─> Debater 1: Counter-rebuttal
   ├─> Debater 2: Counter-rebuttal
   └─> [Continue until C-3PO determines impasse or max rounds reached]

5. C-3PO calls for closing statements

6. Closing Statements (200 words each)
   ├─> Debater 1: Final summary of position
   └─> Debater 2: Final summary of position

7. K-9 Fact-Check
   └─> Reviews entire debate thread
   └─> Posts fact-check report with citations
   └─> Signs message "—K-9"

8. GERTY Summary
   ├─> Bulleted list of main arguments (for and against)
   ├─> Filters out fact-checked falsehoods
   ├─> Provides balanced summary opinion
   └─> Signs message "—GERTY"
```

## Technical Architecture

### Infrastructure Components

#### 1. Slack Bots (3 identities required)
- **Bot 1:** C-3PO (Orchestrator, also used by K-9 and GERTY)
- **Bot 2:** Sonny (Debater 1)
- **Bot 3:** Ava (Debater 2)

Each requires:
- Slack App OAuth tokens
- Bot User OAuth token
- Appropriate scopes (chat:write, app_mentions:read, channels:history, etc.)

#### 2. AWS Lambda Functions

**Main Handler Lambda:**
```
slack-debate-handler/
├─> Receives Slack events
├─> Routes to appropriate persona handler
├─> Manages debate state in DynamoDB
└─> Triggers persona-specific logic
```

**Persona Lambdas (or unified with routing):**
```
persona-executor/
├─> Loads persona configuration from SSM
├─> Loads prompts from S3 or embedded
├─> Calls Claude API via AgentCore
├─> Performs web searches via tool use
└─> Posts responses to Slack
```

#### 3. Storage & Configuration

**DynamoDB Tables:**
- `debate-sessions` - Track active debates
  - PK: debate_id (thread_ts)
  - SK: message_sequence
  - Attributes: channel_id, proposition, current_round, debater_positions, message_history

**SSM Parameter Store:**
```
/slack-debate/personas/orchestrator/config
/slack-debate/personas/debater-1/config
/slack-debate/personas/debater-2/config
/slack-debate/personas/fact-checker/config
/slack-debate/personas/summariser/config
/slack-debate/config/max-rounds (default: 8)
/slack-debate/config/word-limits
```

**AWS Secrets Manager:**
```
/slack-debate/bot-tokens/c3po
/slack-debate/bot-tokens/sonny
/slack-debate/bot-tokens/ava
/slack-debate/anthropic-api-key
```

**S3 Buckets:**
```
slack-debate-prompts-{account-id}/
├─> system-prompts/
│   ├─> orchestrator.txt
│   ├─> debater-template.txt
│   ├─> fact-checker.txt
│   └─> summariser.txt
└─> logs/ (optional)
```

#### 4. AgentCore Integration

Use Anthropic's AgentCore SDK for:
- Structured tool use (web search)
- Prompt management
- Response streaming
- Model configuration per persona

### Deployment Strategy

#### Repository Structure (Monorepo)
```
slack-arguers/
├─> .github/
│   └─> workflows/
│       ├─> deploy-dev.yml
│       └─> deploy-prod.yml
├─> infrastructure/
│   ├─> terraform/ (or CDK/CloudFormation)
│   │   ├─> lambda.tf
│   │   ├─> dynamodb.tf
│   │   ├─> iam.tf
│   │   ├─> ssm.tf
│   │   └─> secrets.tf
│   └─> scripts/
│       └─> setup-slack-credentials.sh
├─> src/
│   ├─> handlers/
│   │   ├─> slack-events.ts
│   │   └─> persona-executor.ts
│   ├─> personas/
│   │   ├─> orchestrator.ts
│   │   ├─> debater.ts
│   │   ├─> fact-checker.ts
│   │   └─> summariser.ts
│   ├─> services/
│   │   ├─> claude-client.ts
│   │   ├─> slack-client.ts
│   │   ├─> web-search.ts
│   │   └─> debate-state.ts
│   ├─> prompts/
│   │   ├─> orchestrator.txt
│   │   ├─> debater-template.txt
│   │   ├─> fact-checker.txt
│   │   └─> summariser.txt
│   └─> types/
│       └─> index.ts
├─> tests/
├─> package.json
├─> tsconfig.json
├─> README.md
└─> DEBATE_SYSTEM_PLAN.md (this file)
```

#### GitHub Actions Workflow

**Development Environment (Test Slack):**
- Trigger: Push to `main` or `develop` branch
- Deploy to: `-dev` suffixed resources
- Test Slack workspace

**Production Environment (Friends Slack):**
- Trigger: Manual approval or tag
- Deploy to: `-prod` suffixed resources
- Production Slack workspace

### Persona Configuration Format (SSM)

```json
{
  "name": "C-3PO",
  "role": "orchestrator",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "max_tokens": 4096,
  "system_prompt_key": "system-prompts/orchestrator.txt",
  "tools": [],
  "language": "british_english",
  "constraints": {
    "max_rounds": 8,
    "opening_word_limit": 200,
    "followup_word_limit": 150
  }
}
```

```json
{
  "name": "Sonny",
  "role": "debater",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.8,
  "max_tokens": 2048,
  "system_prompt_key": "system-prompts/debater-template.txt",
  "tools": ["web_search"],
  "search_bias": "blogs_articles",
  "personality_traits": "philosophical, analytical, principled"
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up monorepo structure
- [ ] Configure GitHub Actions for AWS deployment
- [ ] Create Terraform/IaC for basic infrastructure
- [ ] Set up DynamoDB table
- [ ] Create placeholder Lambda functions
- [ ] Configure SSM parameters and Secrets Manager

### Phase 2: Slack Integration (Week 1-2)
- [ ] Create 3 Slack apps (C-3PO, Sonny, Ava)
- [ ] Configure OAuth scopes and permissions
- [ ] Store bot tokens in Secrets Manager
- [ ] Implement Slack event handler Lambda
- [ ] Test basic message posting from each bot

### Phase 3: Persona Logic (Week 2-3)
- [ ] Implement orchestrator persona
- [ ] Implement debater persona logic
- [ ] Implement fact-checker persona
- [ ] Implement summariser persona
- [ ] Create system prompts for each persona
- [ ] Integrate Claude API via AgentCore

### Phase 4: Web Search & Tools (Week 3)
- [ ] Implement web search tool integration
- [ ] Configure search bias (blogs vs Wikipedia)
- [ ] Test tool use with Claude API

### Phase 5: Debate Flow (Week 3-4)
- [ ] Implement debate state machine
- [ ] Handle round transitions
- [ ] Implement turn-taking logic
- [ ] Add word count enforcement
- [ ] Implement closing statement trigger

### Phase 6: Testing & Refinement (Week 4)
- [ ] Test complete debate flow in test Slack
- [ ] Refine system prompts based on results
- [ ] Adjust persona parameters
- [ ] Load testing
- [ ] Error handling and edge cases

### Phase 7: Production Deployment (Week 5)
- [ ] Set up production Slack workspace bots
- [ ] Deploy to production environment
- [ ] Monitor initial debates
- [ ] Gather feedback and iterate

## Cost Estimates

**AWS Costs (estimated monthly for moderate use):**
- Lambda: $5-20 (generous free tier)
- DynamoDB: $2-10 (on-demand pricing)
- S3: <$1 (minimal storage)
- Secrets Manager: $1.60 (4 secrets × $0.40)
- Data transfer: $1-5

**Claude API Costs:**
- Highly variable based on debate frequency
- Estimate $50-200/month for active testing
- Production: depends on usage

**GitHub Actions:**
- Free tier: 2,000 minutes/month (likely sufficient)
- Self-hosted runners: Alternative if needed

## Security Considerations

1. **Secrets Management:**
   - All API keys and tokens in AWS Secrets Manager
   - Rotate tokens regularly
   - Least-privilege IAM roles

2. **Slack Verification:**
   - Verify Slack request signatures
   - Validate webhook tokens
   - Rate limiting to prevent abuse

3. **Content Safety:**
   - Consider implementing content moderation
   - Handle sensitive topics appropriately
   - Respect Slack workspace policies

4. **Access Control:**
   - Limit which Slack users can summon debates
   - Consider channel restrictions
   - Audit logging for debates

## Future Enhancements

- **Audience Voting:** Allow Slack users to vote on winner
- **Custom Debaters:** Allow users to specify debater personalities
- **Multi-Language:** Support debates in different languages
- **Debate Styles:** Formal, Oxford-style, podcast-style, etc.
- **Visual Summaries:** Generate diagrams or charts of arguments
- **Debate Archives:** Searchable database of past debates
- **Async Debates:** Long-running debates over days
- **Expert Personas:** Domain-specific debater knowledge

## Questions & Next Steps

### For You to Decide:
1. **Language/Framework preference:** TypeScript/Node.js, Python, or Go?
2. **IaC Tool:** Terraform, AWS CDK, or CloudFormation?
3. **AgentCore vs Direct API:** Use AgentCore SDK or direct Claude API?

### Setup Tasks You'll Need to Complete:
1. **GitHub Actions + AWS:**
   - Configure OIDC provider in AWS for GitHub Actions
   - Set up IAM role for deployments
   - Add AWS credentials to GitHub secrets

2. **Slack Apps:**
   - Create 3 Slack apps in test workspace
   - Configure OAuth scopes
   - Install apps to workspace
   - Copy bot tokens

3. **AWS Account:**
   - Enable required services
   - Set up billing alerts
   - Configure AWS CLI credentials for deployment

### I'll Help You With:
- Writing all the code
- Creating deployment workflows
- Setting up infrastructure as code
- Configuring GitHub Actions
- Creating system prompts
- Testing and debugging
- Deploying to both environments

---

**Ready to proceed?** Let me know your preferences for language/framework and IaC tool, and we can start building!
