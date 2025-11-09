/**
 * Sonny Agent (Debater 1)
 *
 * Philosophical, analytical debater who argues from first principles.
 */

import { BaseAgent } from './base-agent';
import { sonnyConfig } from '../config/agent-configs';
import { AgentResponse, DebateMessage } from '../../types';

export class SonnyAgent extends BaseAgent {
  constructor() {
    super(sonnyConfig);
  }

  /**
   * Generate a debate response
   */
  async respond(
    context: { messages: DebateMessage[]; current_round: number },
    position: 'for' | 'against'
  ): Promise<AgentResponse> {
    const { messages, current_round } = context;

    // Get the proposition from the first message
    const proposition = this.extractProposition(messages);

    // Build context from previous messages
    const debateHistory = messages
      .filter((m) => m.persona !== 'c3po')
      .map((m) => `${m.persona.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const isOpening = messages.filter((m) => m.persona === 'sonny').length === 0;
    const wordLimit = isOpening ? 200 : 150;

    // Customize system prompt with position and personality
    const customPrompt = this.config.systemPrompt
      .replace('{PERSONA_NAME}', this.config.name)
      .replace('{PERSONALITY_TRAITS}', this.config.personalityTraits || '')
      .replace(
        '{POSITION}',
        position === 'for' ? 'FOR' : 'AGAINST'
      )
      .replace('{PROPOSITION}', proposition);

    const userPrompt = isOpening
      ? `Provide your opening statement arguing ${position.toUpperCase()} the proposition. Maximum ${wordLimit} words.`
      : `
Previous debate exchanges:
${debateHistory}

Provide your response to your opponent's arguments. Maximum ${wordLimit} words.
      `.trim();

    const content = await this.invokeModel(userPrompt, customPrompt);

    return this.createResponse(content, 'continue');
  }

  private extractProposition(messages: DebateMessage[]): string {
    // Extract from first C-3PO message or return placeholder
    const firstMessage = messages.find((m) => m.persona === 'c3po');
    // Simple extraction - in real implementation, would parse more carefully
    return firstMessage?.content || 'Unknown proposition';
  }
}
