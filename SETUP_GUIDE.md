# Slack Debate System - Complete Setup Guide

This guide will walk you through setting up the Slack Debate System from scratch. Follow each section in order.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [AWS Account Setup](#2-aws-account-setup)
3. [Enable AWS Bedrock and AgentCore](#3-enable-aws-bedrock-and-agentcore)
4. [Configure GitHub OIDC for AWS Deployment](#4-configure-github-oidc-for-aws-deployment)
5. [Create Slack Apps](#5-create-slack-apps)
6. [Deploy Infrastructure](#6-deploy-infrastructure)
7. [Store Slack Tokens in AWS](#7-store-slack-tokens-in-aws)
8. [Configure AgentCore Runtime](#8-configure-agentcore-runtime)
9. [Set Up Slack Webhooks](#9-set-up-slack-webhooks)
10. [Testing Your Setup](#10-testing-your-setup)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Before you begin, ensure you have:

- **AWS Account** with administrative access
- **GitHub Account** with this repository
- **Slack Workspace** where you have admin permissions (for test environment)
- **Local Development Tools**:
  - Node.js 20+ installed
  - AWS CLI configured
  - Git installed
  - Docker installed (for local testing)

### Verify Local Tools

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check AWS CLI
aws --version

# Check Docker
docker --version

# Check Git
git --version
```

---

## 2. AWS Account Setup

### 2.1 Configure AWS CLI

If you haven't already configured the AWS CLI:

```bash
aws configure
```

Provide:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1` (recommended for AgentCore availability)
- Default output format: `json`

### 2.2 Verify AWS Region

AgentCore is available in limited regions. We recommend **us-east-1** or **us-west-2**.

```bash
# Check your configured region
aws configure get region

# If needed, set to us-east-1
aws configure set region us-east-1
```

### 2.3 Set Up Billing Alerts

1. Go to AWS Console → Billing Dashboard
2. Click "Billing preferences"
3. Enable "Receive Billing Alerts"
4. Create a CloudWatch alarm for estimated charges (suggested: $50/month threshold)

---

## 3. Enable AWS Bedrock and AgentCore

### 3.1 Enable Amazon Bedrock

1. **Go to Amazon Bedrock Console**
   - Navigate to: https://console.aws.amazon.com/bedrock/
   - Select your region (us-east-1 recommended)

2. **Request Model Access**
   - Click "Model access" in the left sidebar
   - Click "Request model access"
   - Find and select:
     - ✅ **Claude 3.5 Sonnet** (anthropic.claude-3-5-sonnet-20241022-v2:0)
     - ✅ **Claude 3.5 Haiku** (anthropic.claude-3-5-haiku-20241022-v1:0)
   - Click "Request model access"

3. **Wait for Approval**
   - Anthropic models are usually approved instantly
   - Check "Model access" page - status should show "Access granted"
   - This may take a few minutes

### 3.2 Enable Amazon Bedrock AgentCore

1. **Navigate to AgentCore**
   - In the Bedrock console, find "AgentCore" in the left sidebar
   - Or go directly to: https://console.aws.amazon.com/bedrock/agentcore/

2. **Enable AgentCore Services**
   - Click "Get started" if this is your first time
   - Enable the following services:
     - ✅ **AgentCore Runtime** - For running agents
     - ✅ **AgentCore Memory** - For context management
     - ✅ **AgentCore Observability** - For debugging

3. **Verify Service Availability**
   - Check that AgentCore is available in your selected region
   - If not available, switch to us-east-1 or us-west-2

### 3.3 Test Bedrock Access

```bash
# Test that you can access Bedrock models
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-5`)].modelId'

# Should return:
# [
#     "anthropic.claude-3-5-sonnet-20241022-v2:0",
#     "anthropic.claude-3-5-haiku-20241022-v1:0"
# ]
```

---

## 4. Configure GitHub OIDC for AWS Deployment

This allows GitHub Actions to deploy to AWS without storing long-lived credentials.

### 4.1 Create OIDC Identity Provider in AWS

1. **Go to IAM Console**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Click "Identity providers" in the left sidebar
   - Click "Add provider"

2. **Configure Provider**
   - Provider type: **OpenID Connect**
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Click "Get thumbprint"
   - Audience: `sts.amazonaws.com`
   - Click "Add provider"

### 4.2 Create Deployment Role for Development

1. **Create IAM Role**

```bash
# Get your AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get your GitHub username/org
export GITHUB_ORG="YOUR_GITHUB_USERNAME"  # Replace with your GitHub username
export GITHUB_REPO="slack-arguers"
```

2. **Create trust policy JSON**

```bash
cat > /tmp/github-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
        }
      }
    }
  ]
}
EOF
```

3. **Create the role**

```bash
# Create development deployment role
aws iam create-role \
  --role-name GitHubActionsSlackDebateDev \
  --assume-role-policy-document file:///tmp/github-trust-policy.json \
  --description "Role for GitHub Actions to deploy Slack Debate System (dev)"

# Attach necessary policies
aws iam attach-role-policy \
  --role-name GitHubActionsSlackDebateDev \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Note: PowerUserAccess gives broad permissions. In production, you should
# create a more restrictive custom policy.
```

4. **Get the Role ARN**

```bash
aws iam get-role \
  --role-name GitHubActionsSlackDebateDev \
  --query Role.Arn \
  --output text

# Save this ARN - you'll need it for GitHub Secrets
```

### 4.3 Create Deployment Role for Production

Repeat the process for production:

```bash
# Create production deployment role
aws iam create-role \
  --role-name GitHubActionsSlackDebateProd \
  --assume-role-policy-document file:///tmp/github-trust-policy.json \
  --description "Role for GitHub Actions to deploy Slack Debate System (prod)"

aws iam attach-role-policy \
  --role-name GitHubActionsSlackDebateProd \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Get production role ARN
aws iam get-role \
  --role-name GitHubActionsSlackDebateProd \
  --query Role.Arn \
  --output text
```

### 4.4 Add Secrets to GitHub Repository

1. **Go to your GitHub repository**
   - Navigate to: `https://github.com/YOUR_USERNAME/slack-arguers`

2. **Add Repository Secrets**
   - Click "Settings" → "Secrets and variables" → "Actions"
   - Click "New repository secret"

3. **Add the following secrets:**

   **AWS_DEPLOY_ROLE_ARN_DEV**
   ```
   arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsSlackDebateDev
   ```

   **AWS_DEPLOY_ROLE_ARN_PROD**
   ```
   arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsSlackDebateProd
   ```

---

## 5. Create Slack Apps

You need to create **three Slack apps** - one for each bot identity.

### 5.1 Create C-3PO App (Orchestrator)

1. **Go to Slack API Console**
   - Navigate to: https://api.slack.com/apps
   - Click "Create New App"
   - Select "From scratch"

2. **Configure App**
   - App Name: **C-3PO Debate Orchestrator**
   - Workspace: Select your test workspace
   - Click "Create App"

3. **Configure Bot Token Scopes**
   - In the left sidebar, click "OAuth & Permissions"
   - Scroll to "Scopes" → "Bot Token Scopes"
   - Add the following scopes:
     - ✅ `app_mentions:read` - View messages that mention the app
     - ✅ `chat:write` - Send messages
     - ✅ `channels:history` - View messages in public channels
     - ✅ `groups:history` - View messages in private channels
     - ✅ `im:history` - View messages in DMs

4. **Enable Event Subscriptions**
   - In the left sidebar, click "Event Subscriptions"
   - Toggle "Enable Events" to **On**
   - Request URL: Leave blank for now (we'll update after deploying)
   - Subscribe to bot events:
     - ✅ `app_mention` - When the bot is mentioned

5. **Install App to Workspace**
   - In the left sidebar, click "Install App"
   - Click "Install to Workspace"
   - Review permissions and click "Allow"

6. **Copy Bot Token**
   - After installation, you'll see "Bot User OAuth Token"
   - It starts with `xoxb-`
   - **Save this token** - you'll need it later
   - Format: `xoxb-[NUMBERS]-[NUMBERS]-[RANDOM_STRING]`

7. **Customize Bot Appearance** (Optional)
   - Go to "Basic Information" → "Display Information"
   - Short description: `Diplomatic debate orchestrator`
   - Background color: Gold/Yellow (#FFD700)
   - Upload icon: Find a C-3PO image or use default

### 5.2 Create Sonny App (Debater 1)

Repeat the process for Sonny:

1. **Create New App**
   - Name: **Sonny Debate Agent**
   - Same workspace

2. **Configure Scopes** (same as C-3PO)
   - `app_mentions:read`
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `im:history`

3. **Enable Events** (same as C-3PO)
   - Event: `app_mention`

4. **Install and Get Token**
   - Install to workspace
   - **Save the Bot User OAuth Token** (starts with `xoxb-`)

5. **Customize Appearance** (Optional)
   - Short description: `Philosophical debater arguing from first principles`
   - Background color: Blue (#4A90E2)

### 5.3 Create Ava App (Debater 2)

Repeat for Ava:

1. **Create New App**
   - Name: **Ava Debate Agent**
   - Same workspace

2. **Configure Scopes** (same as above)

3. **Enable Events** (same as above)

4. **Install and Get Token**
   - Install to workspace
   - **Save the Bot User OAuth Token**

5. **Customize Appearance** (Optional)
   - Short description: `Strategic debater with rhetorical sophistication`
   - Background color: Purple (#9B59B6)

### 5.4 Summary - Save These Tokens

You should now have three bot tokens:

```
C-3PO Token:  xoxb-...
Sonny Token:  xoxb-...
Ava Token:    xoxb-...
```

**Keep these safe!** You'll need them in Section 7.

---

## 6. Deploy Infrastructure

Now let's deploy the AWS infrastructure using CDK.

### 6.1 Initial Local Deployment

Before using GitHub Actions, do a test deployment locally:

1. **Install Dependencies**

```bash
cd ~/slack-arguers  # Or wherever you cloned the repo
npm install
```

2. **Bootstrap CDK** (first time only)

```bash
cd infrastructure
npm run cdk bootstrap
```

This creates necessary S3 buckets and IAM roles for CDK.

3. **Deploy to Development**

```bash
npm run cdk deploy -- --context environment=dev

# Review the changes
# Type 'y' to confirm
```

This will create:
- DynamoDB table: `slack-debate-sessions-dev`
- Secrets Manager secrets (empty for now)
- ECR repository: `slack-debate-agent-dev`
- Lambda function: `slack-debate-handler-dev`

4. **Note the Outputs**

After deployment, CDK will output important values:

```
Outputs:
SlackDebateStack-dev.SlackHandlerFunctionName = slack-debate-handler-dev
SlackDebateStack-dev.AgentRepositoryUri = 123456789012.dkr.ecr.us-east-1.amazonaws.com/slack-debate-agent-dev
SlackDebateStack-dev.DebateTableName = slack-debate-sessions-dev
```

**Save these values** - you'll need them.

### 6.2 Build and Push Agent Container

1. **Build the Docker Image**

```bash
cd ~/slack-arguers  # Back to repository root

# Build the agent container
docker build -t slack-debate-agent:latest .
```

2. **Authenticate to ECR**

```bash
# Get your AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

3. **Tag and Push Image**

```bash
# Tag the image
docker tag slack-debate-agent:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/slack-debate-agent-dev:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/slack-debate-agent-dev:latest
```

### 6.3 Verify Deployment

```bash
# Check DynamoDB table
aws dynamodb describe-table --table-name slack-debate-sessions-dev

# Check Lambda function
aws lambda get-function --function-name slack-debate-handler-dev

# Check ECR image
aws ecr describe-images --repository-name slack-debate-agent-dev
```

---

## 7. Store Slack Tokens in AWS

Now that infrastructure is deployed, store your Slack bot tokens in AWS Secrets Manager.

### 7.1 Store C-3PO Token

```bash
# Replace with your actual token from Section 5.1
export C3PO_TOKEN="paste-your-c3po-token-here"

aws secretsmanager put-secret-value \
  --secret-id /slack-debate/dev/bot-tokens/c3po \
  --secret-string "$C3PO_TOKEN"
```

### 7.2 Store Sonny Token

```bash
# Replace with your actual token from Section 5.2
export SONNY_TOKEN="paste-your-sonny-token-here"

aws secretsmanager put-secret-value \
  --secret-id /slack-debate/dev/bot-tokens/sonny \
  --secret-string "$SONNY_TOKEN"
```

### 7.3 Store Ava Token

```bash
# Replace with your actual token from Section 5.3
export AVA_TOKEN="paste-your-ava-token-here"

aws secretsmanager put-secret-value \
  --secret-id /slack-debate/dev/bot-tokens/ava \
  --secret-string "$AVA_TOKEN"
```

### 7.4 Verify Secrets

```bash
# List all secrets
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `slack-debate`)].Name'

# Should show:
# [
#     "/slack-debate/dev/bot-tokens/ava",
#     "/slack-debate/dev/bot-tokens/c3po",
#     "/slack-debate/dev/bot-tokens/sonny"
# ]

# Test retrieving a secret (without showing value)
aws secretsmanager describe-secret \
  --secret-id /slack-debate/dev/bot-tokens/c3po
```

---

## 8. Configure AgentCore Runtime

Currently, the AgentCore Runtime creation is not automated in CDK because it requires the container image to be built first. We'll create it manually using AWS CLI.

### 8.1 Create AgentCore Runtime

**Note:** As of this writing, AgentCore Runtime creation via CLI may not be fully available. This section provides the conceptual approach. Check AWS documentation for the latest AgentCore API.

```bash
# Get the execution role ARN from CDK outputs
export AGENT_EXECUTION_ROLE=$(aws cloudformation describe-stacks \
  --stack-name slack-debate-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentExecutionRoleArn`].OutputValue' \
  --output text)

# Get the container image URI
export CONTAINER_IMAGE=$(aws cloudformation describe-stacks \
  --stack-name slack-debate-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentRepositoryUri`].OutputValue' \
  --output text):latest

echo "Execution Role: $AGENT_EXECUTION_ROLE"
echo "Container Image: $CONTAINER_IMAGE"
```

**Manual Steps** (via AWS Console):

1. **Go to Bedrock AgentCore Console**
   - Navigate to: https://console.aws.amazon.com/bedrock/agentcore/

2. **Create Runtime**
   - Click "Create agent runtime"
   - Name: `slack-debate-runtime-dev`
   - Container image URI: (paste the `CONTAINER_IMAGE` value from above)
   - Execution role: (paste the `AGENT_EXECUTION_ROLE` ARN)
   - Memory: 2048 MB
   - Timeout: 300 seconds
   - Click "Create"

3. **Note the Runtime ARN**
   - After creation, copy the Runtime ARN
   - Format: `arn:aws:bedrock:us-east-1:123456789012:agent-runtime/slack-debate-runtime-dev`

### 8.2 Update Lambda Environment Variable

Once you have the Runtime ARN:

```bash
# Replace with your actual runtime ARN
export AGENT_RUNTIME_ARN="arn:aws:bedrock:us-east-1:123456789012:agent-runtime/slack-debate-runtime-dev"

aws lambda update-function-configuration \
  --function-name slack-debate-handler-dev \
  --environment "Variables={
    ENVIRONMENT=dev,
    DEBATE_TABLE_NAME=slack-debate-sessions-dev,
    C3PO_TOKEN_SECRET_ARN=/slack-debate/dev/bot-tokens/c3po,
    SONNY_TOKEN_SECRET_ARN=/slack-debate/dev/bot-tokens/sonny,
    AVA_TOKEN_SECRET_ARN=/slack-debate/dev/bot-tokens/ava,
    AGENT_RUNTIME_ARN=$AGENT_RUNTIME_ARN
  }"
```

---

## 9. Set Up Slack Webhooks

Now connect Slack to your Lambda function via API Gateway.

### 9.1 Get Webhook URL

The API Gateway was created automatically when you deployed the CDK stack in Section 6. Now you need to get the webhook URL from the deployment outputs.

1. **View Stack Outputs**

```bash
# Get the webhook URL from CDK outputs
aws cloudformation describe-stacks \
  --stack-name slack-debate-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`SlackWebhookUrl`].OutputValue' \
  --output text
```

This will return something like:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/slack/events
```

2. **Copy the Webhook URL**
   - **Save this URL** - you'll need it for all three Slack apps
   - Format: `https://[API_ID].execute-api.[REGION].amazonaws.com/dev/slack/events`

**Alternative:** View in AWS Console
- Go to CloudFormation → Stacks → `slack-debate-dev`
- Click "Outputs" tab
- Find `SlackWebhookUrl` and copy the value

### 9.2 Update Slack Apps with Webhook URL

For **each** of the three Slack apps (C-3PO, Sonny, Ava):

1. **Go to Slack API Console**
   - Navigate to: https://api.slack.com/apps
   - Select the app (C-3PO, Sonny, or Ava)

2. **Update Event Subscriptions**
   - Click "Event Subscriptions" in left sidebar
   - Paste your webhook URL in "Request URL"
   - Example: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/slack/events`
   - Slack will send a verification request
   - If successful, you'll see a green checkmark ✅

3. **Troubleshooting Verification**
   - If verification fails, check Lambda logs:
     ```bash
     aws logs tail /aws/lambda/slack-debate-handler-dev --follow
     ```
   - Look for errors in CloudWatch

4. **Save Changes**
   - Click "Save Changes" at the bottom

5. **Repeat for Other Apps**
   - Update Sonny app with same URL
   - Update Ava app with same URL

---

## 10. Testing Your Setup

Time to test the complete system!

### 10.1 Invite Bots to Channel

1. **Create Test Channel**
   - In Slack, create a new channel: `#debate-test`

2. **Invite C-3PO**
   - In the channel, type: `/invite @C-3PO Debate Orchestrator`

3. **Invite Sonny**
   - Type: `/invite @Sonny Debate Agent`

4. **Invite Ava**
   - Type: `/invite @Ava Debate Agent`

### 10.2 Start Your First Debate

In the `#debate-test` channel, type:

```
@C-3PO debate: Is TypeScript better than JavaScript?
```

### 10.3 What Should Happen

1. **C-3PO Responds** (within ~5 seconds)
   - Welcomes participants
   - States the proposition
   - Assigns positions to Sonny and Ava
   - Explains debate rules

2. **Sonny Responds** (Opening statement)
   - Posts ~200 word argument for their assigned position

3. **Ava Responds** (Opening statement)
   - Posts ~200 word argument for their position

4. **Debate Continues**
   - Alternating responses (~150 words each)
   - Continues for up to 8 rounds

5. **C-3PO Calls for Closing**
   - When impasse is reached or max rounds hit

6. **Closing Statements**
   - Both debaters provide final arguments

7. **K-9 Fact-Checks** (using C-3PO's identity)
   - Reviews claims and posts fact-check report
   - Signs as "—K-9"

8. **GERTY Summarizes** (using C-3PO's identity)
   - Posts comprehensive summary
   - Signs as "—GERTY"

### 10.4 Check Logs

Monitor the debate in real-time:

```bash
# Watch Lambda logs
aws logs tail /aws/lambda/slack-debate-handler-dev --follow

# Check DynamoDB for debate records
aws dynamodb scan --table-name slack-debate-sessions-dev
```

### 10.5 Troubleshooting First Debate

**If C-3PO doesn't respond:**
1. Check CloudWatch logs for errors
2. Verify webhook URL is correct in Slack app settings
3. Check API Gateway logs
4. Verify Slack token is correct in Secrets Manager

**If agents don't respond:**
1. Check AgentCore Runtime status
2. Verify Bedrock model access is granted
3. Check Lambda has permission to invoke AgentCore
4. Review execution role permissions

**If debate flow is wrong:**
1. Check DynamoDB table for debate state
2. Review orchestrator logic in logs
3. Verify agent responses in CloudWatch

---

## 11. Troubleshooting

### Common Issues

#### Issue: "Verification failed" when setting up Slack webhook

**Solution:**
```bash
# Check Lambda logs during verification
aws logs tail /aws/lambda/slack-debate-handler-dev --follow

# Test the API Gateway endpoint directly
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/slack-events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'

# Should return: {"challenge":"test123"}
```

#### Issue: Lambda timeout errors

**Solution:**
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name slack-debate-handler-dev \
  --timeout 60

# Increase memory (often speeds up execution)
aws lambda update-function-configuration \
  --function-name slack-debate-handler-dev \
  --memory-size 1024
```

#### Issue: "Access Denied" when calling Bedrock

**Solution:**
```bash
# Verify model access
aws bedrock list-foundation-models \
  --query 'modelSummaries[?contains(modelId, `claude`)].{ID:modelId,Status:modelLifecycle.status}'

# Check Lambda execution role has Bedrock permissions
aws iam get-role-policy \
  --role-name slack-debate-handler-dev-role \
  --policy-name bedrock-access
```

#### Issue: AgentCore Runtime not responding

**Solution:**
1. Check Runtime status in AgentCore console
2. Verify container image exists in ECR
3. Check execution role has necessary permissions
4. Review CloudWatch logs for the runtime

#### Issue: Slack tokens not working

**Solution:**
```bash
# Test token directly
export TOKEN="paste-your-actual-token-here"
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer $TOKEN"

# Should return: {"ok":true,...}

# If it fails, regenerate token in Slack app settings
```

### Viewing Logs

**Lambda Logs:**
```bash
# Tail logs in real-time
aws logs tail /aws/lambda/slack-debate-handler-dev --follow

# View last 100 lines
aws logs tail /aws/lambda/slack-debate-handler-dev --since 1h

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/slack-debate-handler-dev \
  --filter-pattern "ERROR"
```

**AgentCore Logs:**
```bash
# View runtime logs
aws logs tail /aws/bedrock-agentcore/slack-debate-runtime-dev --follow
```

**API Gateway Logs:**
1. Go to API Gateway Console
2. Select your API
3. Click "Stages" → "dev"
4. Check "CloudWatch Logs"

### Testing Components Individually

**Test Lambda directly:**
```bash
# Create test event
cat > /tmp/test-event.json <<EOF
{
  "type": "event_callback",
  "event": {
    "type": "app_mention",
    "channel": "C1234567890",
    "user": "U1234567890",
    "text": "@C-3PO debate: test proposition",
    "ts": "1234567890.123456"
  }
}
EOF

# Invoke Lambda
aws lambda invoke \
  --function-name slack-debate-handler-dev \
  --payload file:///tmp/test-event.json \
  /tmp/response.json

cat /tmp/response.json
```

**Test DynamoDB access:**
```bash
# List debates
aws dynamodb scan \
  --table-name slack-debate-sessions-dev \
  --max-items 5

# Get specific debate
aws dynamodb get-item \
  --table-name slack-debate-sessions-dev \
  --key '{"debate_id":{"S":"1234567890.123456"},"message_sequence":{"N":"0"}}'
```

### Getting Help

If you're stuck:

1. **Check CloudWatch Logs** - Most issues will show up here
2. **Review the plan** - See `DEBATE_SYSTEM_PLAN.md` for architecture details
3. **Check AWS Service Health** - https://status.aws.amazon.com/
4. **Slack API Status** - https://status.slack.com/

### Cleanup (if needed)

To tear down the entire stack:

```bash
# Destroy dev environment
cd infrastructure
npm run cdk destroy -- --context environment=dev

# Delete secrets manually (CDK won't delete them if they contain values)
aws secretsmanager delete-secret \
  --secret-id /slack-debate/dev/bot-tokens/c3po \
  --force-delete-without-recovery

aws secretsmanager delete-secret \
  --secret-id /slack-debate/dev/bot-tokens/sonny \
  --force-delete-without-recovery

aws secretsmanager delete-secret \
  --secret-id /slack-debate/dev/bot-tokens/ava \
  --force-delete-without-recovery

# Delete AgentCore Runtime (via console or CLI)
```

---

## Next Steps

Once your dev environment is working:

1. **Deploy to Production**
   - Create production Slack workspace/apps
   - Tag your code: `git tag v0.1.0 && git push origin v0.1.0`
   - GitHub Actions will deploy to production

2. **Customize Personas**
   - Edit prompts in `src/prompts/`
   - Adjust agent configs in `src/agent/config/agent-configs.ts`
   - Rebuild and redeploy

3. **Add Features**
   - Implement web search tool
   - Add more debate formats
   - Create custom debater personalities

4. **Monitor Costs**
   - Review AWS Cost Explorer weekly
   - Set up budget alerts
   - Optimize model usage (use Haiku where possible)

---

## Success Checklist

- [ ] AWS account configured with Bedrock and AgentCore enabled
- [ ] Three Slack apps created (C-3PO, Sonny, Ava)
- [ ] GitHub OIDC configured for deployments
- [ ] Infrastructure deployed via CDK
- [ ] Slack tokens stored in Secrets Manager
- [ ] AgentCore Runtime created and configured
- [ ] API Gateway webhook connected to Slack
- [ ] First debate completed successfully
- [ ] All agents responding correctly
- [ ] Fact-checking and summary working

**Congratulations!** Your Slack Debate System is now live! 🎉
