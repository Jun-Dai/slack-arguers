/**
 * K-9 Agent (Fact-Checker)
 *
 * Precise, bureaucratic fact-checker that verifies claims made during debates.
 */

import { BaseAgent } from './base-agent';
import { k9Config } from '../config/agent-configs';
import { AgentResponse, DebateMessage } from '../../types';

export class K9Agent extends BaseAgent {
  constructor() {
    super(k9Config);
  }

  /**
   * Fact-check all claims made during the debate
   */
  async factCheck(messages: DebateMessage[]): Promise<AgentResponse> {
    // Filter to only debater messages
    const debaterMessages = messages.filter(
      (m) => m.persona === 'sonny' || m.persona === 'ava'
    );

    // Build a summary of all claims
    const allClaims = debaterMessages
      .map((m, i) => `[${m.persona.toUpperCase()} - Statement ${i + 1}]\n${m.content}`)
      .join('\n\n');

    const prompt = `
Review the following debate statements and identify any factual claims that are:
1. FALSE (demonstrably incorrect)
2. MISLEADING (technically true but deceptive)
3. UNVERIFIABLE (cannot be confirmed with available sources)

Debate statements:
${allClaims}

Provide your fact-check report. Use web_search to verify claims when needed.
Only report problematic claims - if everything is accurate, state that briefly.

Remember to:
- Be concise and bureaucratic in tone
- Use British English
- Provide citations
- Sign with "—K-9"
    `.trim();

    const content = await this.invokeModel(prompt);

    return this.createResponse(content, 'summarize');
  }
}
