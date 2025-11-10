#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SlackDebateStack } from '../lib/slack-debate-stack';

const app = new cdk.App();

// Get environment from context (default to 'dev')
const environment = app.node.tryGetContext('environment') || 'dev';

// Create the main stack
new SlackDebateStack(app, `SlackDebateStack-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment,
  stackName: `slack-debate-${environment}`,
  description: `Slack Debate System - ${environment} environment`,
  tags: {
    Application: 'SlackDebate',
    Environment: environment,
    ManagedBy: 'CDK',
    experiment: 'claude-play',
  },
});

app.synth();
