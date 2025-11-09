import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './database-constructs';
import { SecretsConstruct } from './secrets-constructs';
import { LambdaConstruct } from './lambda-constructs';
import { AgentCoreConstruct } from './agentcore-constructs';
import { ApiGatewayConstruct } from './apigateway-constructs';

export interface SlackDebateStackProps extends cdk.StackProps {
  environment: string;
}

export class SlackDebateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SlackDebateStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Secrets Manager for Slack tokens
    const secrets = new SecretsConstruct(this, 'Secrets', {
      environment,
    });

    // DynamoDB tables for debate state
    const database = new DatabaseConstruct(this, 'Database', {
      environment,
    });

    // AgentCore Runtime for multi-agent debate system
    const agentCore = new AgentCoreConstruct(this, 'AgentCore', {
      environment,
    });

    // Lambda function for Slack event handling
    const lambda = new LambdaConstruct(this, 'Lambda', {
      environment,
      debateTable: database.debateTable,
      c3poTokenSecret: secrets.c3poTokenSecret,
      sonnyTokenSecret: secrets.sonnyTokenSecret,
      avaTokenSecret: secrets.avaTokenSecret,
      agentRuntimeArn: agentCore.runtimeArn,
    });

    // API Gateway for Slack webhooks
    const apiGateway = new ApiGatewayConstruct(this, 'ApiGateway', {
      environment,
      slackHandler: lambda.slackHandler,
    });

    // Outputs
    new cdk.CfnOutput(this, 'SlackHandlerFunctionName', {
      value: lambda.slackHandler.functionName,
      description: 'Slack event handler Lambda function name',
      exportName: `${environment}-slack-handler-function-name`,
    });

    new cdk.CfnOutput(this, 'AgentRuntimeArn', {
      value: agentCore.runtimeArn,
      description: 'AgentCore Runtime ARN',
      exportName: `${environment}-agentcore-runtime-arn`,
    });

    new cdk.CfnOutput(this, 'DebateTableName', {
      value: database.debateTable.tableName,
      description: 'DynamoDB table for debate sessions',
      exportName: `${environment}-debate-table-name`,
    });
  }
}
