# Slack Debate System - Architecture Plan

## Overview

A multi-persona AI debate system for Slack that orchestrates structured debates between AI agents, complete with fact-checking and summarisation. The system will run on AWS using **Amazon Bedrock AgentCore** for multi-agent orchestration with managed memory, deployed via AWS CDK, written in TypeScript.

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

## Why AgentCore for This System?

**Key Benefits:**

1. **Automatic Context Management:**
   - AgentCore Memory handles conversation history across all debate rounds
   - No manual token counting or context window management
   - Persistent memory means agents can reference earlier arguments

2. **Multi-Agent Orchestration:**
   - Each persona (C-3PO, Sonny, Ava, K-9, GERTY) is a separate agent
   - Different models per agent (Sonnet for complex reasoning, Haiku for fact-checking)
   - Agents can operate sequentially or in parallel

3. **Production-Ready Infrastructure:**
   - Serverless runtime scales automatically
   - Built-in observability for debugging debates
   - Session isolation for security

4. **Simplified Secrets Management:**
   - IAM-based auth for Bedrock models (no Anthropic API key!)
   - Only 3 Slack tokens to manage

5. **Cost Optimization:**
   - Use cheaper Haiku model for fact-checking
   - Pay only for runtime hours and tokens used
   - AgentCore Memory more efficient than managing context manually

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

#### 2. Amazon Bedrock AgentCore Runtime

**Debate System Agent Runtime:**
```
Multi-Agent Debate System
├─> AgentCore Runtime (serverless, managed infrastructure)
├─> AgentCore Memory (persistent context across debate rounds)
├─> AgentCore Identity (IAM-based, no API keys!)
└─> AgentCore Observability (tracing, debugging, monitoring)

Agent Configuration:
├─> C-3PO Agent
│   ├─> Model: Claude 3.5 Sonnet
│   ├─> Temperature: 0.7 (balanced)
│   └─> Role: Orchestration & moderation
├─> Sonny Agent
│   ├─> Model: Claude 3.5 Sonnet
│   ├─> Temperature: 0.8 (creative)
│   ├─> Tools: Web search (blogs/articles bias)
│   └─> Role: Debater (assigned position)
├─> Ava Agent
│   ├─> Model: Claude 3.5 Sonnet
│   ├─> Temperature: 0.8 (strategic)
│   ├─> Tools: Web search (blogs/articles bias)
│   └─> Role: Debater (opposing position)
├─> K-9 Agent
│   ├─> Model: Claude 3.5 Haiku (cost-efficient)
│   ├─> Temperature: 0.3 (precise)
│   ├─> Tools: Web search (Wikipedia bias)
│   └─> Role: Fact-checking
└─> GERTY Agent
    ├─> Model: Claude 3.5 Sonnet
    ├─> Temperature: 0.5 (balanced)
    └─> Role: Summary & analysis
```

**Slack Event Handler Lambda:**
```
slack-event-handler/
├─> Receives Slack events (mentions, messages)
├─> Invokes AgentCore Runtime via SDK
├─> Manages debate state in DynamoDB
├─> Routes responses back to Slack
└─> Handles async debate orchestration
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
(No Anthropic API key needed - using Bedrock with IAM!)
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

#### 4. AWS Bedrock AgentCore Integration

**AgentCore Services Used:**

**Runtime:**
- Serverless, managed runtime for multi-agent system
- Supports any framework (we'll use custom TypeScript agents)
- Model-agnostic: each agent can use different models
- Real-time and async execution modes

**Memory:**
- Managed memory infrastructure (no manual context management!)
- Persistent across debate rounds
- Automatic context compaction
- Short-term (per-debate) and long-term (optional) memory

**Identity:**
- IAM-based authentication (no Anthropic API keys!)
- Session isolation for security
- VPC connectivity support

**Observability:**
- Built-in tracing and debugging
- Unified operational dashboards
- Performance monitoring

**Model Configuration:**
- **Primary:** `anthropic.claude-3-5-sonnet-20241022-v2:0` (C-3PO, Sonny, Ava, GERTY)
- **Cost-Efficient:** `anthropic.claude-3-5-haiku-20241022-v1:0` (K-9 for fact-checking)
- **Authentication:** IAM role only
- **Benefits:**
  - No Anthropic API key needed
  - Only 3 Slack tokens in Secrets Manager
  - Automatic memory/context management
  - Production-ready at scale
  - Different models per agent for cost optimization

### Deployment Strategy

#### Repository Structure (Monorepo)
```
slack-arguers/
├─> .github/
│   └─> workflows/
│       ├─> deploy-dev.yml            # Deploy to test Slack workspace
│       └─> deploy-prod.yml           # Deploy to production Slack workspace
├─> infrastructure/
│   ├─> lib/
│   │   ├─> slack-debate-stack.ts     # Main CDK stack
│   │   ├─> agentcore-constructs.ts   # AgentCore Runtime deployment
│   │   ├─> lambda-constructs.ts      # Slack handler Lambda
│   │   ├─> database-constructs.ts    # DynamoDB tables
│   │   └─> secrets-constructs.ts     # Secrets Manager resources
│   ├─> bin/
│   │   └─> app.ts                    # CDK app entry point
│   ├─> cdk.json
│   └─> tsconfig.json
├─> src/
│   ├─> agent/
│   │   ├─> index.ts                  # AgentCore entrypoint
│   │   ├─> orchestrator.ts           # Multi-agent coordinator
│   │   ├─> agents/
│   │   │   ├─> c3po.ts               # Orchestrator agent
│   │   │   ├─> sonny.ts              # Debater 1 agent
│   │   │   ├─> ava.ts                # Debater 2 agent
│   │   │   ├─> k9.ts                 # Fact-checker agent
│   │   │   └─> gerty.ts              # Summariser agent
│   │   ├─> tools/
│   │   │   ├─> web-search.ts         # Web search tool
│   │   │   └─> slack-poster.ts       # Tool to post to Slack
│   │   └─> config/
│   │       └─> agent-configs.ts      # Agent model/temperature configs
│   ├─> lambda/
│   │   └─> slack-handler.ts          # Slack event handler Lambda
│   ├─> services/
│   │   ├─> agentcore-client.ts       # AgentCore SDK wrapper
│   │   ├─> slack-client.ts           # Slack API wrapper
│   │   └─> debate-state.ts           # DynamoDB state management
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
├─> Dockerfile                        # For AgentCore Runtime container
├─> .dockerignore
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

### Agent Configuration Format (in code)

**C-3PO (Orchestrator) Configuration:**
```typescript
{
  name: "C-3PO",
  role: "orchestrator",
  modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: loadPrompt("orchestrator.txt"),
  tools: [],
  language: "british_english",
  constraints: {
    maxRounds: 8,
    openingWordLimit: 200,
    followupWordLimit: 150
  }
}
```

**Sonny (Debater) Configuration:**
```typescript
{
  name: "Sonny",
  role: "debater",
  modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  temperature: 0.8,
  maxTokens: 2048,
  systemPrompt: loadPrompt("debater-template.txt"),
  tools: [
    {
      name: "web_search",
      description: "Search the web for information",
      searchBias: "blogs_articles"  // Prioritize blogs and opinion pieces
    }
  ],
  personalityTraits: "philosophical, analytical, principled"
}
```

**K-9 (Fact-Checker) Configuration:**
```typescript
{
  name: "K-9",
  role: "fact_checker",
  modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",  // Cost-efficient
  temperature: 0.3,
  maxTokens: 2048,
  systemPrompt: loadPrompt("fact-checker.txt"),
  tools: [
    {
      name: "web_search",
      description: "Search for factual information",
      searchBias: "wikipedia"  // Prioritize authoritative sources
    }
  ],
  language: "british_english"
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up monorepo structure
- [ ] Configure GitHub Actions for AWS deployment
- [ ] Create CDK infrastructure for basic setup
- [ ] Set up DynamoDB table for debate state
- [ ] Create Dockerfile for AgentCore Runtime
- [ ] Configure Secrets Manager for Slack tokens

### Phase 2: Slack Integration (Week 1-2)
- [ ] Create 3 Slack apps (C-3PO, Sonny, Ava)
- [ ] Configure OAuth scopes and permissions
- [ ] Store bot tokens in Secrets Manager
- [ ] Implement Slack event handler Lambda
- [ ] Test basic message posting from each bot

### Phase 3: AgentCore Setup (Week 2)
- [ ] Set up AgentCore Runtime with CDK
- [ ] Configure AgentCore Memory for debate context
- [ ] Create base agent structure
- [ ] Implement agent entrypoint and orchestrator
- [ ] Test basic AgentCore invocation from Lambda

### Phase 4: Agent Implementation (Week 2-3)
- [ ] Implement C-3PO orchestrator agent
- [ ] Implement Sonny debater agent
- [ ] Implement Ava debater agent
- [ ] Implement K-9 fact-checker agent
- [ ] Implement GERTY summariser agent
- [ ] Create system prompts for each agent

### Phase 5: Web Search & Tools (Week 3)
- [ ] Implement web search tool for agents
- [ ] Configure search bias (blogs vs Wikipedia)
- [ ] Integrate tools with AgentCore agents
- [ ] Test tool use with different models

### Phase 6: Debate Flow (Week 3-4)
- [ ] Implement debate state machine in orchestrator
- [ ] Handle round transitions via AgentCore Memory
- [ ] Implement turn-taking logic
- [ ] Add word count enforcement
- [ ] Implement closing statement trigger
- [ ] Wire up all agents in debate sequence

### Phase 7: Testing & Refinement (Week 4)
- [ ] Test complete debate flow in test Slack
- [ ] Refine system prompts based on results
- [ ] Adjust agent parameters (temperature, models)
- [ ] Test AgentCore Memory persistence
- [ ] Load testing and performance optimization
- [ ] Error handling and edge cases

### Phase 8: Production Deployment (Week 5)
- [ ] Set up production Slack workspace bots
- [ ] Deploy AgentCore Runtime to production
- [ ] Deploy production Lambda and infrastructure
- [ ] Monitor initial debates via AgentCore Observability
- [ ] Gather feedback and iterate

## Cost Estimates

**AWS Costs (estimated monthly for moderate use):**

**Infrastructure:**
- Lambda (Slack handler): $2-5 (generous free tier, low usage)
- DynamoDB: $2-10 (on-demand pricing)
- S3: <$1 (minimal storage for prompts)
- Secrets Manager: $1.20 (3 Slack bot tokens × $0.40)
- Data transfer: $1-3

**Bedrock AgentCore:**
- **Runtime:** ~$0.06 per agent runtime hour
  - Example: 20 debates × 30 min avg = 10 hours/month = $0.60
- **Memory:** Pricing based on storage and requests
  - Short-term memory (per-debate): Minimal cost
  - Estimate: $1-5/month for moderate use

**Bedrock Model Costs:**
- **Claude 3.5 Sonnet** (C-3PO, Sonny, Ava, GERTY):
  - Input: $3 per million tokens
  - Output: $15 per million tokens
- **Claude 3.5 Haiku** (K-9 fact-checker):
  - Input: $0.8 per million tokens
  - Output: $4 per million tokens

**Example Calculation (20 debates/month, ~5 rounds each):**
- C-3PO: ~10K tokens/debate × 20 = 200K tokens = $1.50
- Sonny: ~15K tokens/debate × 20 = 300K tokens = $2.70
- Ava: ~15K tokens/debate × 20 = 300K tokens = $2.70
- K-9 (Haiku): ~5K tokens/debate × 20 = 100K tokens = $0.36
- GERTY: ~8K tokens/debate × 20 = 160K tokens = $1.56
- **Total Model Costs:** ~$9/month

**Total Estimated Monthly Cost:** $17-35 for moderate use (20 debates/month)
**Scaling:** $50-80/month for heavy use (100+ debates/month)

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

## Technology Stack (Decided)

- **Language:** TypeScript/Node.js
- **Infrastructure:** AWS CDK (minimum setup, infrastructure as code)
- **AI Agent Platform:** Amazon Bedrock AgentCore
  - **Runtime:** Serverless multi-agent orchestration
  - **Memory:** Managed context persistence
  - **Models:** Claude 3.5 Sonnet + Haiku via Bedrock (IAM-based, no API keys!)
  - **Observability:** Built-in tracing and monitoring
- **Deployment:** GitHub Actions + Docker (for AgentCore container)
- **Compute:** AWS Lambda (Slack handler) + AgentCore Runtime (agents)
- **Storage:** DynamoDB (debate state) + AgentCore Memory (context)
- **Secrets:** AWS Secrets Manager (only 3 Slack tokens)

## Setup Tasks You'll Need to Complete:
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
   - **Enable Bedrock AgentCore:**
     - Go to AWS Bedrock console
     - Enable AgentCore services (Runtime, Memory, etc.)
     - Note: AgentCore is currently available in limited regions
   - **Enable Bedrock model access:**
     - Request access to Claude 3.5 Sonnet model
     - Request access to Claude 3.5 Haiku model
     - Wait for approval (usually instant for Anthropic models)
   - Enable required services (Lambda, DynamoDB, Secrets Manager, ECR for Docker)
   - Set up billing alerts
   - Configure AWS region (recommend us-east-1 or us-west-2 for AgentCore availability)

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
