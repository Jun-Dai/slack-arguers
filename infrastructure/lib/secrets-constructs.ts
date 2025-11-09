import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SecretsConstructProps {
  environment: string;
}

export class SecretsConstruct extends Construct {
  public readonly c3poTokenSecret: secretsmanager.ISecret;
  public readonly sonnyTokenSecret: secretsmanager.ISecret;
  public readonly avaTokenSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: SecretsConstructProps) {
    super(scope, id);

    const { environment } = props;

    // C-3PO bot token (Orchestrator, K-9, GERTY)
    this.c3poTokenSecret = new secretsmanager.Secret(this, 'C3POTokenSecret', {
      secretName: `/slack-debate/${environment}/bot-tokens/c3po`,
      description: 'Slack bot token for C-3PO (Orchestrator/K-9/GERTY)',
      removalPolicy:
        environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Sonny bot token (Debater 1)
    this.sonnyTokenSecret = new secretsmanager.Secret(
      this,
      'SonnyTokenSecret',
      {
        secretName: `/slack-debate/${environment}/bot-tokens/sonny`,
        description: 'Slack bot token for Sonny (Debater 1)',
        removalPolicy:
          environment === 'prod'
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY,
      }
    );

    // Ava bot token (Debater 2)
    this.avaTokenSecret = new secretsmanager.Secret(this, 'AvaTokenSecret', {
      secretName: `/slack-debate/${environment}/bot-tokens/ava`,
      description: 'Slack bot token for Ava (Debater 2)',
      removalPolicy:
        environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Tags
    [this.c3poTokenSecret, this.sonnyTokenSecret, this.avaTokenSecret].forEach(
      (secret) => {
        cdk.Tags.of(secret).add('Component', 'Secrets');
        cdk.Tags.of(secret).add('Environment', environment);
      }
    );

    // Outputs
    new cdk.CfnOutput(this, 'C3POTokenSecretArn', {
      value: this.c3poTokenSecret.secretArn,
      description: 'ARN of C-3PO Slack bot token secret',
    });

    new cdk.CfnOutput(this, 'SonnyTokenSecretArn', {
      value: this.sonnyTokenSecret.secretArn,
      description: 'ARN of Sonny Slack bot token secret',
    });

    new cdk.CfnOutput(this, 'AvaTokenSecretArn', {
      value: this.avaTokenSecret.secretArn,
      description: 'ARN of Ava Slack bot token secret',
    });
  }
}
