/**
 * Base Agent Class
 *
 * Provides common functionality for all debate agents including
 * Bedrock model invocation, prompt management, and tool use.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { AgentConfig, AgentResponse } from '../../types';

export abstract class BaseAgent {
  protected client: BedrockRuntimeClient;
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Invoke the Bedrock model with the given prompt
   */
  protected async invokeModel(
    userPrompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const messages = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt || this.config.systemPrompt,
      messages,
    };

    // Add tools if configured
    if (this.config.tools && this.config.tools.length > 0) {
      // TODO: Implement tool definitions for Bedrock format
      // This will include web_search tool
    }

    const input: InvokeModelCommandInput = {
      modelId: this.config.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    };

    try {
      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);

      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      );

      // Extract content from Claude response
      const content =
        responseBody.content?.[0]?.text || 'No response generated';

      return content;
    } catch (error) {
      console.error('Error invoking Bedrock model:', error);
      throw error;
    }
  }

  /**
   * Count words in text
   */
  protected countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Create an agent response object
   */
  protected createResponse(
    content: string,
    nextAction?: AgentResponse['next_action']
  ): AgentResponse {
    return {
      persona: this.config.name.toLowerCase().replace('-', ''),
      role: this.config.role,
      content,
      next_action: nextAction,
      metadata: {
        word_count: this.countWords(content),
      },
    };
  }
}
