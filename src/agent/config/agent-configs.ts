import { AgentConfig } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to load prompts from files
function loadPrompt(filename: string): string {
  const promptPath = path.join(__dirname, '../../prompts', filename);
  return fs.readFileSync(promptPath, 'utf-8');
}

// C-3PO (Orchestrator) Configuration
export const c3poConfig: AgentConfig = {
  name: 'C-3PO',
  role: 'orchestrator',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: loadPrompt('orchestrator.txt'),
  tools: [],
  language: 'british_english',
  constraints: {
    maxRounds: 8,
    openingWordLimit: 200,
    followupWordLimit: 150,
  },
};

// Sonny (Debater 1) Configuration
export const sonnyConfig: AgentConfig = {
  name: 'Sonny',
  role: 'debater',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  temperature: 0.8,
  maxTokens: 2048,
  systemPrompt: loadPrompt('debater-template.txt'),
  tools: [
    {
      name: 'web_search',
      description: 'Search the web for information, articles, and blog posts',
      searchBias: 'blogs_articles',
    },
  ],
  personalityTraits: 'philosophical, analytical, principled - argues from first principles',
};

// Ava (Debater 2) Configuration
export const avaConfig: AgentConfig = {
  name: 'Ava',
  role: 'debater',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  temperature: 0.8,
  maxTokens: 2048,
  systemPrompt: loadPrompt('debater-template.txt'),
  tools: [
    {
      name: 'web_search',
      description: 'Search the web for information, articles, and blog posts',
      searchBias: 'blogs_articles',
    },
  ],
  personalityTraits: 'strategic, persuasive, adaptive - argues with rhetorical sophistication',
};

// K-9 (Fact-Checker) Configuration
export const k9Config: AgentConfig = {
  name: 'K-9',
  role: 'fact_checker',
  modelId: 'anthropic.claude-3-5-haiku-20241022-v1:0', // Cost-efficient model
  temperature: 0.3,
  maxTokens: 2048,
  systemPrompt: loadPrompt('fact-checker.txt'),
  tools: [
    {
      name: 'web_search',
      description: 'Search for factual information from authoritative sources',
      searchBias: 'wikipedia',
    },
  ],
  language: 'british_english',
};

// GERTY (Summariser) Configuration
export const gertyConfig: AgentConfig = {
  name: 'GERTY',
  role: 'summariser',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  temperature: 0.5,
  maxTokens: 3072,
  systemPrompt: loadPrompt('summariser.txt'),
  tools: [],
  language: 'british_english',
};

// Export all configs
export const agentConfigs = {
  c3po: c3poConfig,
  sonny: sonnyConfig,
  ava: avaConfig,
  k9: k9Config,
  gerty: gertyConfig,
};
