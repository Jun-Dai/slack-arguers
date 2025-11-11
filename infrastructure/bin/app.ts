#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SlackDebateStack } from '../lib/slack-debate-stack';

const app = new cdk.App();

// Create the main stack
new SlackDebateStack(app, 'SlackDebateStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  stackName: 'slack-debate',
  description: 'Slack Debate System - Multi-AI persona debate bot',
  tags: {
    Application: 'SlackDebate',
    ManagedBy: 'CDK',
    experiment: 'claude-play',
  },
});

app.synth();
