/**
 * Debate Orchestrator
 *
 * Coordinates the multi-agent debate system by routing requests to appropriate
 * agents and managing the debate flow.
 */

import { AgentInvocationPayload, AgentResponse } from '../types';
import { C3POAgent } from './agents/c3po';
import { SonnyAgent } from './agents/sonny';
import { AvaAgent } from './agents/ava';
import { K9Agent } from './agents/k9';
import { GERTYAgent } from './agents/gerty';

export class DebateOrchestrator {
  private c3po: C3POAgent;
  private sonny: SonnyAgent;
  private ava: AvaAgent;
  private k9: K9Agent;
  private gerty: GERTYAgent;

  constructor() {
    // Initialize all agents
    this.c3po = new C3POAgent();
    this.sonny = new SonnyAgent();
    this.ava = new AvaAgent();
    this.k9 = new K9Agent();
    this.gerty = new GERTYAgent();
  }

  /**
   * Initialize a new debate
   */
  async initializeDebate(
    payload: AgentInvocationPayload
  ): Promise<AgentResponse> {
    console.log('Initializing debate', { proposition: payload.proposition });

    if (!payload.proposition) {
      throw new Error('Proposition is required for debate initialization');
    }

    // C-3PO orchestrates the debate setup
    return await this.c3po.initialize(payload.proposition);
  }

  /**
   * Handle debate responses (debater turns)
   */
  async handleResponse(
    payload: AgentInvocationPayload
  ): Promise<AgentResponse> {
    console.log('Handling debate response', {
      debate_id: payload.debate_id,
      round: payload.context?.current_round,
    });

    if (!payload.context) {
      throw new Error('Context is required for debate responses');
    }

    // Determine which agent should respond next
    const lastMessage =
      payload.context.messages[payload.context.messages.length - 1];

    // Simple turn-taking logic
    // TODO: Make this more sophisticated based on debate state
    if (!lastMessage || lastMessage.persona === 'c3po') {
      // First response after C-3PO initialization
      const position = payload.context.debater_positions.sonny;
      return await this.sonny.respond(payload.context, position);
    } else if (lastMessage.persona === 'sonny') {
      const position = payload.context.debater_positions.ava;
      return await this.ava.respond(payload.context, position);
    } else if (lastMessage.persona === 'ava') {
      // Check if we should continue or call for closing
      const shouldContinue = await this.c3po.shouldContinueDebate(
        payload.context
      );
      if (shouldContinue) {
        const position = payload.context.debater_positions.sonny;
        return await this.sonny.respond(payload.context, position);
      } else {
        // C-3PO calls for closing statements
        return await this.c3po.callForClosingStatements(payload.context);
      }
    }

    throw new Error('Unable to determine next speaker');
  }

  /**
   * Handle fact-checking phase
   */
  async handleFactCheck(
    payload: AgentInvocationPayload
  ): Promise<AgentResponse> {
    console.log('Handling fact check', { debate_id: payload.debate_id });

    if (!payload.context) {
      throw new Error('Context is required for fact-checking');
    }

    // K-9 reviews all debate messages and fact-checks claims
    return await this.k9.factCheck(payload.context.messages);
  }

  /**
   * Handle summary phase
   */
  async handleSummary(
    payload: AgentInvocationPayload
  ): Promise<AgentResponse> {
    console.log('Handling summary', { debate_id: payload.debate_id });

    if (!payload.context) {
      throw new Error('Context is required for summary');
    }

    // GERTY summarizes the debate
    return await this.gerty.summarize(
      payload.context.messages,
      payload.proposition || ''
    );
  }
}
