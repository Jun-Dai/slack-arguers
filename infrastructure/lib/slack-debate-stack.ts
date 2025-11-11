import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './database-constructs';
import { SecretsConstruct } from './secrets-constructs';
import { LambdaConstruct } from './lambda-constructs';
import { AgentCoreConstruct } from './agentcore-constructs';
import { ApiGatewayConstruct } from './apigateway-constructs';

export class SlackDebateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Secrets Manager for Slack tokens
    const secrets = new SecretsConstruct(this, 'Secrets');

    // DynamoDB tables for debate state
    const database = new DatabaseConstruct(this, 'Database');

    // AgentCore Runtime for multi-agent debate system
    const agentCore = new AgentCoreConstruct(this, 'AgentCore');

    // Lambda function for Slack event handling
    const lambda = new LambdaConstruct(this, 'Lambda', {
      debateTable: database.debateTable,
      c3poTokenSecret: secrets.c3poTokenSecret,
      sonnyTokenSecret: secrets.sonnyTokenSecret,
      avaTokenSecret: secrets.avaTokenSecret,
      agentRuntimeArn: agentCore.runtimeArn,
    });

    // API Gateway for Slack webhooks
    const apiGateway = new ApiGatewayConstruct(this, 'ApiGateway', {
      slackHandler: lambda.slackHandler,
    });

    // Outputs
    new cdk.CfnOutput(this, 'SlackHandlerFunctionName', {
      value: lambda.slackHandler.functionName,
      description: 'Slack event handler Lambda function name',
    });

    new cdk.CfnOutput(this, 'AgentRuntimeArn', {
      value: agentCore.runtimeArn,
      description: 'AgentCore Runtime ARN',
    });

    new cdk.CfnOutput(this, 'DebateTableName', {
      value: database.debateTable.tableName,
      description: 'DynamoDB table for debate sessions',
    });

    new cdk.CfnOutput(this, 'WebhookUrl', {
      value: apiGateway.webhookUrl,
      description: 'Slack webhook URL for event subscriptions',
    });
  }
}
