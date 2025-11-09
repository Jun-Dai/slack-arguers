/**
 * C-3PO Agent (Orchestrator)
 *
 * Welcomes participants, sets up debates, monitors progress,
 * and determines when to call for closing statements.
 */

import { BaseAgent } from './base-agent';
import { c3poConfig } from '../config/agent-configs';
import { AgentResponse, DebateMessage } from '../../types';

export class C3POAgent extends BaseAgent {
  constructor() {
    super(c3poConfig);
  }

  /**
   * Initialize a new debate
   */
  async initialize(proposition: string): Promise<AgentResponse> {
    // Randomly assign positions (50/50 chance)
    const sonnyPosition = Math.random() < 0.5 ? 'for' : 'against';
    const avaPosition = sonnyPosition === 'for' ? 'against' : 'for';

    const prompt = `
A new debate has been initiated with the following proposition:

"${proposition}"

Please provide a warm welcome to participants and introduce the debate with the following details:
- Proposition: "${proposition}"
- Debater positions:
  - Sonny: ${sonnyPosition === 'for' ? 'FOR' : 'AGAINST'} (philosophical, analytical debater)
  - Ava: ${avaPosition === 'for' ? 'FOR' : 'AGAINST'} (strategic, persuasive debater)
- Rules:
  - Opening statements: 200 words maximum
  - Follow-up statements: 150 words maximum
  - Maximum ${this.config.constraints?.maxRounds || 8} rounds

Set the stage for an engaging debate. Use British English and maintain your welcoming, diplomatic persona.
    `.trim();

    const content = await this.invokeModel(prompt);

    // Store debater positions in metadata (this will be persisted by the Lambda)
    return {
      ...this.createResponse(content, 'continue'),
      metadata: {
        word_count: this.countWords(content),
        debater_positions: {
          sonny: sonnyPosition,
          ava: avaPosition,
        },
      },
    };
  }

  /**
   * Determine if the debate should continue or move to closing statements
   */
  async shouldContinueDebate(context: {
    messages: DebateMessage[];
    current_round: number;
  }): Promise<boolean> {
    const { messages, current_round } = context;
    const maxRounds = this.config.constraints?.maxRounds || 8;

    // Check if max rounds reached
    if (current_round >= maxRounds) {
      return false;
    }

    // Analyze recent messages for circular arguments or impasse
    // For now, simple implementation - will enhance later
    const recentMessages = messages.slice(-4); // Last 2 rounds

    const prompt = `
You are monitoring a debate. Here are the last few exchanges:

${recentMessages.map((m, i) => `${i + 1}. ${m.persona}: ${m.content}`).join('\n\n')}

Current round: ${current_round}/${maxRounds}

Determine if the debate should continue or if it's time to call for closing statements.
Call for closing statements if:
- Arguments are becoming circular
- Debaters are repeating themselves
- An impasse has been reached
- We're approaching max rounds (within 1-2 rounds)

Respond with ONLY "CONTINUE" or "CLOSE".
    `.trim();

    const response = await this.invokeModel(prompt);

    return response.trim().toUpperCase() === 'CONTINUE';
  }

  /**
   * Call for closing statements
   */
  async callForClosingStatements(context: {
    messages: DebateMessage[];
  }): Promise<AgentResponse> {
    const prompt = `
The debate has reached a point where closing statements are appropriate.

Please provide a message that:
1. Acknowledges the substantive arguments made by both sides
2. Calls for closing statements from each debater
3. Reminds them of the 200-word limit for closing statements
4. Maintains your warm, diplomatic tone

Use British English.
    `.trim();

    const content = await this.invokeModel(prompt);

    return this.createResponse(content, 'closing_statements');
  }
}
