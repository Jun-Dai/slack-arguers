/**
 * AgentCore Runtime Entry Point
 *
 * This is the main entry point for the multi-agent debate system running on
 * Amazon Bedrock AgentCore Runtime.
 *
 * The AgentCore SDK will invoke this handler with payloads from the Slack
 * event handler Lambda.
 */

import { AgentInvocationPayload, AgentResponse } from '../types';
import { DebateOrchestrator } from './orchestrator';

// Initialize the debate orchestrator
const orchestrator = new DebateOrchestrator();

/**
 * Main handler function called by AgentCore Runtime
 *
 * @param payload - The invocation payload from Slack event handler
 * @param context - AgentCore context (provided by the runtime)
 * @returns AgentResponse with the result
 */
export async function handler(
  payload: AgentInvocationPayload,
  context?: unknown
): Promise<AgentResponse> {
  console.log('AgentCore handler invoked', {
    debate_id: payload.debate_id,
    action: payload.action,
    context: context ? 'provided' : 'not provided',
  });

  try {
    // Route to appropriate handler based on action
    switch (payload.action) {
      case 'initialize':
        return await orchestrator.initializeDebate(payload);

      case 'respond':
        return await orchestrator.handleResponse(payload);

      case 'fact_check':
        return await orchestrator.handleFactCheck(payload);

      case 'summarize':
        return await orchestrator.handleSummary(payload);

      default:
        throw new Error(`Unknown action: ${payload.action}`);
    }
  } catch (error) {
    console.error('Error in AgentCore handler:', error);
    throw error;
  }
}

// Export for AgentCore Runtime
export default handler;
