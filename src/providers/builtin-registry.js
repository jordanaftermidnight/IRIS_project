/**
 * BUILTIN_PROVIDERS — first-class OpenAI-compatible services that ship
 * with IRIS out of the box. The user only needs to set an API key (env
 * var) to enable any of them. User config can override any field via
 * deep-merge, or disable a builtin with `{ disabled: true }`.
 *
 * Quarterly maintenance ritual: model IDs and pricing rotate every
 * 1–3 months across these providers. Refresh against each provider's
 * current docs. Search this file for the apiKeyEnv values to find the
 * full set of services that need a check.
 *
 * Notes:
 * - Cerebras, Together, OpenRouter, DeepSeek, Grok, Mistral, Kimi,
 * Perplexity all advertise OpenAI Chat Completions compatibility.
 * - MiniMax has its own native API as primary; the OpenAI-compatible
 * endpoint at api.minimaxi.chat works for chat but lacks some
 * advanced features (vision, function calling). Override models if
 * the international endpoint isn't reachable from your region.
 */
export const BUILTIN_PROVIDERS = {
  kimi: {
    baseURL: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    description: 'Moonshot Kimi',
    priority: 4,
    costTier: 'low',
    models: {
      fast: 'moonshot-v1-8k',
      balanced: 'moonshot-v1-32k',
      large: 'moonshot-v1-128k',
      complex: 'moonshot-v1-128k',
    },
    rates: {
      'moonshot-v1-8k': { input: 0.000012, output: 0.000012 },
      'moonshot-v1-32k': { input: 0.000024, output: 0.000024 },
      'moonshot-v1-128k': { input: 0.00006, output: 0.00006 },
    },
  },

  minimax: {
    baseURL: 'https://api.minimaxi.chat/v1',
    apiKeyEnv: 'MINIMAX_API_KEY',
    description: 'MiniMax',
    priority: 4,
    costTier: 'low',
    models: {
      fast: 'MiniMax-Text-01',
      balanced: 'MiniMax-Text-01',
      large: 'MiniMax-Text-01',
    },
  },

  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    description: 'DeepSeek (chat + reasoner)',
    priority: 3,
    costTier: 'low',
    models: {
      fast: 'deepseek-chat',
      balanced: 'deepseek-chat',
      code: 'deepseek-coder',
      complex: 'deepseek-reasoner',
      reasoning: 'deepseek-reasoner',
      large: 'deepseek-reasoner',
    },
    rates: {
      'deepseek-chat': { input: 0.00000027, output: 0.0000011 },
      'deepseek-coder': { input: 0.00000027, output: 0.0000011 },
      'deepseek-reasoner': { input: 0.00000055, output: 0.0000022 },
    },
  },

  grok: {
    baseURL: 'https://api.x.ai/v1',
    apiKeyEnv: 'XAI_API_KEY',
    description: 'xAI Grok',
    priority: 4,
    costTier: 'medium',
    models: {
      fast: 'grok-4-fast',
      balanced: 'grok-4',
      complex: 'grok-4',
      reasoning: 'grok-4',
      large: 'grok-4',
      vision: 'grok-4',
    },
  },

  mistral: {
    baseURL: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    description: 'Mistral La Plateforme',
    priority: 4,
    costTier: 'medium',
    models: {
      fast: 'mistral-small-latest',
      balanced: 'mistral-large-latest',
      large: 'mistral-large-latest',
      code: 'codestral-latest',
      complex: 'mistral-large-latest',
      reasoning: 'mistral-large-latest',
    },
  },

  cerebras: {
    baseURL: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    description: 'Cerebras (ultra-fast wafer-scale inference)',
    priority: 2,
    costTier: 'low',
    models: {
      fast: 'llama3.1-8b',
      ultra_fast: 'llama3.1-8b',
      balanced: 'llama-3.3-70b',
      large: 'llama-3.3-70b',
      code: 'llama-3.3-70b',
    },
  },

  together: {
    baseURL: 'https://api.together.xyz/v1',
    apiKeyEnv: 'TOGETHER_API_KEY',
    description: 'Together AI (open-weight specialist)',
    priority: 4,
    costTier: 'low',
    models: {
      fast: 'meta-llama/Llama-3.3-8B-Instruct-Turbo',
      balanced: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      large: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      code: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    },
  },

  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    description: 'OpenRouter (300+ models, single endpoint)',
    priority: 5,
    costTier: 'medium',
    models: {
      fast: 'meta-llama/llama-3.3-8b-instruct',
      balanced: 'meta-llama/llama-3.3-70b-instruct',
      large: 'anthropic/claude-sonnet-4.6',
      complex: 'openai/o3-mini',
      reasoning: 'openai/o3-mini',
    },
  },

  perplexity: {
    baseURL: 'https://api.perplexity.ai',
    apiKeyEnv: 'PERPLEXITY_API_KEY',
    description: 'Perplexity (search-augmented)',
    priority: 4,
    costTier: 'medium',
    models: {
      fast: 'sonar',
      balanced: 'sonar-pro',
      complex: 'sonar-reasoning-pro',
      reasoning: 'sonar-reasoning-pro',
      large: 'sonar-reasoning-pro',
    },
  },

  cohere: {
    // Cohere ships an OpenAI-compatible endpoint at compatibility/v1.
    // Command A+ (command-a-plus-05-2026) is the current flagship —
    // MoE, vision, reasoning, agentic.
    baseURL: 'https://api.cohere.com/compatibility/v1',
    apiKeyEnv: 'COHERE_API_KEY',
    description: 'Cohere (Command A+, R+, agentic)',
    priority: 4,
    costTier: 'medium',
    models: {
      fast: 'command-r7b-12-2024',
      balanced: 'command-a-03-2025',
      large: 'command-a-plus-05-2026',
      complex: 'command-a-plus-05-2026',
      reasoning: 'command-a-reasoning-08-2025',
      code: 'command-a-03-2025',
      vision: 'command-a-plus-05-2026',
    },
  },

  huggingface: {
    // HuggingFace's Inference Providers router exposes OpenAI-compatible
    // endpoints across many backends (together, fireworks, novita, etc).
    // Set HF_API_KEY (read+inference scope); pin specific models via
    // user config since the lineup is huge and changes constantly.
    baseURL: 'https://router.huggingface.co/v1',
    apiKeyEnv: 'HF_API_KEY',
    description: 'HuggingFace Inference Providers (router)',
    priority: 5,
    costTier: 'medium',
    models: {
      fast: 'meta-llama/Llama-3.3-70B-Instruct',
      balanced: 'meta-llama/Llama-3.3-70B-Instruct',
      large: 'meta-llama/Llama-3.3-70B-Instruct',
      code: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    },
  },
};

export default BUILTIN_PROVIDERS;
