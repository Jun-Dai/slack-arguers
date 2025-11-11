# IAM Setup for GitHub Actions

This document describes the IAM policies needed for GitHub Actions to deploy the Slack Debate system.

## Two Policies Approach

We use **two separate policies** for security best practices:

1. **Main Policy** (`github-actions-iam-policy.json`) - Always attached
2. **Bootstrap Policy** (`github-actions-bootstrap-policy.json`) - Only attached during CDK bootstrap

This follows the principle of least privilege: bootstrap permissions are only available when needed.

---

## Initial Setup

### Step 1: Create the IAM Role

If you haven't already:

1. Go to **IAM → Roles** in AWS Console
2. Create role: `GitHubActionsSlackDebateDev`
3. Trusted entity type: **Web identity**
4. Identity provider: `token.actions.githubusercontent.com`
5. Audience: `sts.amazonaws.com`

### Step 2: Attach the Main Policy

1. Go to **IAM → Roles → GitHubActionsSlackDebateDev**
2. Click **Add permissions → Create inline policy**
3. Click **JSON** tab
4. Copy contents of `docs/github-actions-iam-policy.json`
5. Paste and click **Review policy**
6. Name: `GitHubActionsSlackDebateMainPolicy`
7. Click **Create policy**

---

## One-Time Bootstrap Setup

CDK requires bootstrapping once per AWS account/region to create infrastructure for storing deployment assets.

### Step 1: Temporarily Attach Bootstrap Policy

1. Go to **IAM → Roles → GitHubActionsSlackDebateDev**
2. Click **Add permissions → Create inline policy**
3. Click **JSON** tab
4. Copy contents of `docs/github-actions-bootstrap-policy.json`
5. Paste and click **Review policy**
6. Name: `GitHubActionsSlackDebateBootstrapPolicy`
7. Click **Create policy**

### Step 2: Run Bootstrap Workflow

1. Go to **Actions** tab in GitHub
2. Select **"CDK Bootstrap (One-time Setup)"**
3. Click **Run workflow**
4. Select environment: **dev**
5. Click **Run workflow**
6. Wait for completion

### Step 3: Remove Bootstrap Policy

**IMPORTANT: Remove the bootstrap policy after bootstrap completes!**

1. Go to **IAM → Roles → GitHubActionsSlackDebateDev**
2. Find `GitHubActionsSlackDebateBootstrapPolicy`
3. Click **Remove**
4. Confirm deletion

---

## Main Policy Permissions

The main policy (`github-actions-iam-policy.json`) includes:

- **ECR**: Push/pull Docker images
- **CloudFormation**: Deploy CDK stacks
- **Lambda**: Create/update functions
- **DynamoDB**: Create/manage tables
- **Secrets Manager**: Create/manage secrets
- **API Gateway**: Create/manage APIs
- **IAM**: Create roles for Lambda/Bedrock (scoped to `slack-debate-*` and `cdk-*`)
- **S3**: Read/write CDK assets
- **SSM**: Read CDK bootstrap version

## Bootstrap Policy Permissions (Temporary)

The bootstrap policy (`github-actions-bootstrap-policy.json`) includes:

- **S3**: Create CDK asset buckets
- **SSM**: Write CDK bootstrap version parameter
- **ECR**: Create CDK container asset repository
- **CloudFormation**: Deploy CDKToolkit stack

These permissions are **only needed once** for initial setup.

---

## Security Notes

### Why Separate Policies?

- **Principle of Least Privilege**: Bootstrap permissions are elevated (create buckets, write SSM params)
- **Defense in Depth**: Reduces attack surface for regular deployments
- **Audit Trail**: Clear separation between setup and deployment operations

### Resource Scoping

All permissions are scoped where possible:
- IAM roles: `slack-debate-*` and `cdk-*` patterns only
- S3/ECR/SSM: `cdk-*` resources only
- CloudFormation: Specific stack names
- PassRole: Limited to Lambda, API Gateway, Bedrock services

### Remaining Wildcards

Some services still use `"Resource": "*"`:
- Lambda, DynamoDB, Secrets Manager, API Gateway, CloudWatch Logs

This is necessary because CDK generates dynamic resource names. These could be further restricted with tag-based conditions if needed.

---

## Troubleshooting

### "Access Denied" during deployment

Check that the **main policy** is attached to the role.

### "Access Denied" during bootstrap

Check that the **bootstrap policy** is temporarily attached to the role.

### "SSM parameter not found"

The account hasn't been bootstrapped yet. Run the bootstrap workflow first.

### Can't create S3 bucket / SSM parameter during regular deployment

Good! This means the bootstrap policy is correctly removed. These operations should only happen during bootstrap.
