/**
 * Slack Event Handler Lambda
 *
 * Receives Slack events (mentions, messages), manages debate state in DynamoDB,
 * and invokes the AgentCore Runtime to process debates.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { WebClient } from '@slack/web-api';
import { SlackEvent, DebateSession, AgentInvocationPayload } from '../types';

// Initialize AWS clients
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const secretsClient = new SecretsManagerClient({});

// Environment variables
const DEBATE_TABLE_NAME = process.env.DEBATE_TABLE_NAME!;
const C3PO_TOKEN_SECRET_ARN = process.env.C3PO_TOKEN_SECRET_ARN!;
const SONNY_TOKEN_SECRET_ARN = process.env.SONNY_TOKEN_SECRET_ARN!;
const AVA_TOKEN_SECRET_ARN = process.env.AVA_TOKEN_SECRET_ARN!;
const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN!;

// Cache for Slack tokens
let slackTokens: {
  c3po?: string;
  sonny?: string;
  ava?: string;
} = {};

/**
 * Get Slack token from Secrets Manager
 */
async function getSlackToken(persona: 'c3po' | 'sonny' | 'ava'): Promise<string> {
  if (slackTokens[persona]) {
    return slackTokens[persona]!;
  }

  const secretArn =
    persona === 'c3po'
      ? C3PO_TOKEN_SECRET_ARN
      : persona === 'sonny'
      ? SONNY_TOKEN_SECRET_ARN
      : AVA_TOKEN_SECRET_ARN;

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );

  const token = response.SecretString!;
  slackTokens[persona] = token;
  return token;
}

/**
 * Post a message to Slack
 */
async function postToSlack(
  persona: 'c3po' | 'sonny' | 'ava',
  channel: string,
  thread_ts: string,
  text: string
): Promise<void> {
  const token = await getSlackToken(persona);
  const client = new WebClient(token);

  await client.chat.postMessage({
    channel,
    thread_ts,
    text,
  });
}

/**
 * Invoke AgentCore Runtime
 */
async function invokeAgent(payload: AgentInvocationPayload): Promise<any> {
  // TODO: Implement AgentCore Runtime invocation using the SDK
  // For now, return a placeholder
  console.log('Would invoke agent with payload:', payload);
  return {
    persona: 'c3po',
    role: 'orchestrator',
    content: 'Agent runtime not yet connected',
    next_action: 'continue',
  };
}

/**
 * Parse Slack command from message
 */
function parseDebateCommand(text: string): string | null {
  // Match patterns like:
  // "@C-3PO debate: proposition"
  // "debate: proposition"
  const match = text.match(/debate:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Main Lambda handler
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const body = JSON.parse(event.body || '{}') as SlackEvent;

    // Handle Slack URL verification challenge
    if (body.challenge) {
      return {
        statusCode: 200,
        body: JSON.stringify({ challenge: body.challenge }),
      };
    }

    // Handle app_mention events
    if (body.type === 'event_callback' && body.event.type === 'app_mention') {
      const { channel, text, ts, thread_ts, user } = body.event;

      // Check if this is a debate command
      const proposition = parseDebateCommand(text);

      if (proposition) {
        // Start a new debate
        const debateId = thread_ts || ts; // Use thread_ts if in thread, otherwise message ts

        // Create debate session in DynamoDB
        const session: DebateSession = {
          debate_id: debateId,
          channel_id: channel,
          proposition,
          status: 'initializing',
          current_round: 0,
          max_rounds: 8,
          debater_positions: {
            sonny: 'for', // Will be set by orchestrator
            ava: 'against',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        };

        await dynamoClient.send(
          new PutCommand({
            TableName: DEBATE_TABLE_NAME,
            Item: session,
          })
        );

        // Invoke AgentCore to initialize debate
        const agentPayload: AgentInvocationPayload = {
          debate_id: debateId,
          channel_id: channel,
          thread_ts: debateId,
          action: 'initialize',
          proposition,
        };

        const response = await invokeAgent(agentPayload);

        // Post C-3PO's response to Slack
        await postToSlack('c3po', channel, debateId, response.content);

        // Update session with debater positions if provided
        if (response.metadata?.debater_positions) {
          session.debater_positions = response.metadata.debater_positions;
          session.status = 'opening';
          await dynamoClient.send(
            new PutCommand({
              TableName: DEBATE_TABLE_NAME,
              Item: session,
            })
          );
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error('Error handling Slack event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
