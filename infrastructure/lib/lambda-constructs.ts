import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaConstructProps {
  environment: string;
  debateTable: dynamodb.Table;
  c3poTokenSecret: secretsmanager.ISecret;
  sonnyTokenSecret: secretsmanager.ISecret;
  avaTokenSecret: secretsmanager.ISecret;
  agentRuntimeArn: string;
}

export class LambdaConstruct extends Construct {
  public readonly slackHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const {
      environment,
      debateTable,
      c3poTokenSecret,
      sonnyTokenSecret,
      avaTokenSecret,
      agentRuntimeArn,
    } = props;

    // Slack event handler Lambda function
    this.slackHandler = new lambdaNodejs.NodejsFunction(
      this,
      'SlackHandler',
      {
        functionName: `slack-debate-handler-${environment}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(
          __dirname,
          '../../src/lambda/slack-handler.ts'
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          ENVIRONMENT: environment,
          DEBATE_TABLE_NAME: debateTable.tableName,
          C3PO_TOKEN_SECRET_ARN: c3poTokenSecret.secretArn,
          SONNY_TOKEN_SECRET_ARN: sonnyTokenSecret.secretArn,
          AVA_TOKEN_SECRET_ARN: avaTokenSecret.secretArn,
          AGENT_RUNTIME_ARN: agentRuntimeArn,
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
        bundling: {
          minify: true,
          sourceMap: true,
          target: 'es2022',
          externalModules: ['@aws-sdk/*'],
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // Grant DynamoDB permissions
    debateTable.grantReadWriteData(this.slackHandler);

    // Grant Secrets Manager read permissions
    c3poTokenSecret.grantRead(this.slackHandler);
    sonnyTokenSecret.grantRead(this.slackHandler);
    avaTokenSecret.grantRead(this.slackHandler);

    // Grant permission to invoke AgentCore Runtime
    this.slackHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock-agentcore:InvokeAgentRuntime',
          'bedrock-agentcore:GetAgentRuntime',
        ],
        resources: [agentRuntimeArn],
      })
    );

    // Tags
    cdk.Tags.of(this.slackHandler).add('Component', 'Lambda');
    cdk.Tags.of(this.slackHandler).add('Environment', environment);

    // Output
    new cdk.CfnOutput(this, 'SlackHandlerFunctionArn', {
      value: this.slackHandler.functionArn,
      description: 'ARN of Slack handler Lambda function',
      exportName: `${environment}-slack-handler-arn`,
    });
  }
}
