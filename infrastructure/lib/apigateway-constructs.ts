import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiGatewayConstructProps {
  slackHandler: lambda.Function;
}

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly webhookUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const { slackHandler } = props;

    // Create REST API
    this.api = new apigateway.RestApi(this, 'SlackDebateApi', {
      restApiName: 'slack-debate-api',
      description: 'Slack Debate System API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 10,
        throttlingBurstLimit: 20,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST'],
      },
    });

    // Create /slack/events resource
    const slackEvents = this.api.root.addResource('slack').addResource('events');

    // Add POST method with Lambda integration
    slackEvents.addMethod(
      'POST',
      new apigateway.LambdaIntegration(slackHandler, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
        ],
      }
    );

    // Construct webhook URL
    this.webhookUrl = `${this.api.url}slack/events`;

    // Tags
    cdk.Tags.of(this.api).add('Component', 'ApiGateway');

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway base URL',
    });

    new cdk.CfnOutput(this, 'SlackWebhookUrl', {
      value: this.webhookUrl,
      description: 'Slack webhook URL (use this in Slack app Event Subscriptions)',
    });
  }
}
