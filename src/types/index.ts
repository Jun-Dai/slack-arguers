// Debate system types

export interface DebateSession {
  debate_id: string; // Slack thread_ts
  channel_id: string;
  proposition: string;
  status: 'initializing' | 'opening' | 'debating' | 'closing' | 'fact_checking' | 'summarizing' | 'completed';
  current_round: number;
  max_rounds: number;
  debater_positions: {
    sonny: 'for' | 'against';
    ava: 'for' | 'against';
  };
  created_at: string;
  updated_at: string;
  ttl?: number; // Unix timestamp for DynamoDB TTL (30 days)
}

export interface DebateMessage {
  debate_id: string;
  message_sequence: number;
  persona: 'c3po' | 'sonny' | 'ava' | 'k9' | 'gerty';
  role: 'orchestrator' | 'debater' | 'fact_checker' | 'summariser';
  content: string;
  timestamp: string;
  slack_ts?: string; // Slack message timestamp
  word_count: number;
}

export interface AgentConfig {
  name: string;
  role: 'orchestrator' | 'debater' | 'fact_checker' | 'summariser';
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools?: Tool[];
  language?: 'british_english';
  constraints?: {
    maxRounds?: number;
    openingWordLimit?: number;
    followupWordLimit?: number;
  };
  personalityTraits?: string;
}

export interface Tool {
  name: string;
  description: string;
  searchBias?: 'blogs_articles' | 'wikipedia';
  inputSchema?: Record<string, unknown>;
}

export interface SlackEvent {
  type: string;
  event: {
    type: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
    bot_id?: string;
    app_mention?: boolean;
  };
  challenge?: string;
}

export interface AgentInvocationPayload {
  debate_id: string;
  channel_id: string;
  thread_ts: string;
  action: 'initialize' | 'respond' | 'fact_check' | 'summarize';
  proposition?: string;
  context?: {
    messages: DebateMessage[];
    current_round: number;
    debater_positions: Record<string, 'for' | 'against'>;
  };
}

export interface AgentResponse {
  persona: string;
  role: string;
  content: string;
  next_action?: 'continue' | 'closing_statements' | 'fact_check' | 'summarize' | 'complete';
  metadata?: {
    word_count: number;
    tool_calls?: unknown[];
  };
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}
