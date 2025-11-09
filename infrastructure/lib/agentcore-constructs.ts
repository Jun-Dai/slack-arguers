import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AgentCoreConstructProps {
  environment: string;
}

export class AgentCoreConstruct extends Construct {
  public readonly runtimeArn: string;
  public readonly repository: ecr.Repository;
  public readonly executionRole: iam.Role;

  constructor(scope: Construct, id: string, props: AgentCoreConstructProps) {
    super(scope, id);

    const { environment } = props;

    // ECR repository for AgentCore container image
    this.repository = new ecr.Repository(this, 'AgentRepository', {
      repositoryName: `slack-debate-agent-${environment}`,
      removalPolicy:
        environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
    });

    // IAM role for AgentCore Runtime execution
    this.executionRole = new iam.Role(this, 'AgentExecutionRole', {
      roleName: `slack-debate-agent-execution-${environment}`,
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Execution role for AgentCore Runtime',
    });

    // Grant Bedrock model access
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          // Claude 3.5 Sonnet
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
          // Claude 3.5 Haiku
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
        ],
      })
    );

    // Grant access to AgentCore Memory
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock-agentcore:CreateMemory',
          'bedrock-agentcore:GetMemory',
          'bedrock-agentcore:UpdateMemory',
          'bedrock-agentcore:DeleteMemory',
          'bedrock-agentcore:ListMemories',
        ],
        resources: ['*'], // Scoped to the account/region
      })
    );

    // Grant CloudWatch Logs access for observability
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/bedrock-agentcore/*`,
        ],
      })
    );

    // NOTE: The actual AgentCore Runtime will be created via the AgentCore SDK
    // during the agent deployment process, not through CDK. This is because
    // AgentCore Runtime creation requires the container image to be built and
    // pushed to ECR first.
    //
    // The runtime ARN will be stored as an SSM parameter after creation.
    // For now, we'll use a placeholder that will be updated during deployment.

    const runtimeArnParameter = new cdk.CfnParameter(this, 'AgentRuntimeArn', {
      type: 'String',
      description: 'ARN of the AgentCore Runtime (populated after deployment)',
      default: 'PLACEHOLDER_WILL_BE_UPDATED_AFTER_FIRST_DEPLOY',
    });

    this.runtimeArn = runtimeArnParameter.valueAsString;

    // Tags
    cdk.Tags.of(this.repository).add('Component', 'AgentCore');
    cdk.Tags.of(this.repository).add('Environment', environment);
    cdk.Tags.of(this.executionRole).add('Component', 'AgentCore');
    cdk.Tags.of(this.executionRole).add('Environment', environment);

    // Outputs
    new cdk.CfnOutput(this, 'AgentRepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR repository URI for agent container',
      exportName: `${environment}-agent-repository-uri`,
    });

    new cdk.CfnOutput(this, 'AgentExecutionRoleArn', {
      value: this.executionRole.roleArn,
      description: 'IAM role ARN for agent execution',
      exportName: `${environment}-agent-execution-role-arn`,
    });
  }
}
