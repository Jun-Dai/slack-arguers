import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseConstruct extends Construct {
  public readonly debateTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // DynamoDB table for tracking active debates
    this.debateTable = new dynamodb.Table(this, 'DebateSessionsTable', {
      tableName: 'slack-debate-sessions',
      partitionKey: {
        name: 'debate_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'message_sequence',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });

    // GSI for querying by channel
    this.debateTable.addGlobalSecondaryIndex({
      indexName: 'channel-index',
      partitionKey: {
        name: 'channel_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // GSI for querying by status
    this.debateTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'updated_at',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Tags
    cdk.Tags.of(this.debateTable).add('Component', 'Database');
  }
}
