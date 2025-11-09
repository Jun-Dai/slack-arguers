/**
 * GERTY Agent (Summariser)
 *
 * Fair-minded, intellectually honest summariser focused on truth-seeking.
 */

import { BaseAgent } from './base-agent';
import { gertyConfig } from '../config/agent-configs';
import { AgentResponse, DebateMessage } from '../../types';

export class GERTYAgent extends BaseAgent {
  constructor() {
    super(gertyConfig);
  }

  /**
   * Summarize the debate and provide analysis
   */
  async summarize(
    messages: DebateMessage[],
    proposition: string
  ): Promise<AgentResponse> {
    // Separate messages by type
    const debaterMessages = messages.filter(
      (m) => m.persona === 'sonny' || m.persona === 'ava'
    );
    const factCheckMessage = messages.find((m) => m.persona === 'k9');

    // Build debate transcript
    const transcript = debaterMessages
      .map((m) => `**${m.persona.toUpperCase()}:** ${m.content}`)
      .join('\n\n');

    const factCheckInfo = factCheckMessage
      ? `\n\nFact-check report:\n${factCheckMessage.content}`
      : '';

    const prompt = `
Proposition: "${proposition}"

Debate transcript:
${transcript}
${factCheckInfo}

Provide a comprehensive summary following the format specified in your system prompt:
1. Main arguments FOR the proposition
2. Main arguments AGAINST the proposition
3. Analysis of argument quality and strength
4. Summary opinion focused on truth-seeking

Remember to:
- Use British English
- Be rigorously impartial
- Focus on intellectual honesty over politeness
- Exclude fact-checked falsehoods
- Sign with "—GERTY"
    `.trim();

    const content = await this.invokeModel(prompt);

    return this.createResponse(content, 'complete');
  }
}
