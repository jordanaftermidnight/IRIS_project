#!/usr/bin/env node

import MultiAI from './index.js';

/**
 * IRIS CLI
 * Command-line interface with improved error handling and features
 */

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    command: args[0],
    message: '',
    options: {}
  };

  // Extract task type
  const taskArg = args.find(arg => arg.startsWith('--task='));
  if (taskArg) {
    result.options.taskType = taskArg.split('=')[1];
  }

  // Extract provider flag
  const providerArg = args.find(arg => arg.startsWith('--provider='));
  if (providerArg) {
    result.options.provider = providerArg.split('=')[1];
  }

  // Extract session flag
  const sessionArg = args.find(arg => arg.startsWith('--session='));
  if (sessionArg) {
    result.options.sessionId = sessionArg.split('=')[1];
  }

  // Server flags (used by `iris serve`).
  const portArg = args.find(arg => arg.startsWith('--port='));
  if (portArg) result.options.port = portArg.split('=')[1];
  const hostArg = args.find(arg => arg.startsWith('--host='));
  if (hostArg) result.options.host = hostArg.split('=')[1];
  const drainArg = args.find(arg => arg.startsWith('--drain='));
  if (drainArg) result.options.drainSeconds = Number(drainArg.split('=')[1]);
  if (args.includes('--mdns')) result.options.mdns = true;
  if (args.includes('--no-mdns')) result.options.mdns = false;

  // Council flags (used by `iris council`).
  const providersArg = args.find(arg => arg.startsWith('--providers='));
  if (providersArg) {
    result.options.providers = providersArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  const excludeArg = args.find(arg => arg.startsWith('--exclude='));
  if (excludeArg) {
    result.options.exclude = excludeArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
  if (timeoutArg) result.options.timeoutMs = Number(timeoutArg.split('=')[1]) * 1000;
  const judgeArg = args.find(arg => arg.startsWith('--judge='));
  if (judgeArg) result.options.judge = judgeArg.split('=')[1];
  result.options.merge = args.includes('--merge');

  // Extract other flags
  result.options.stream = args.includes('--stream');
  result.options.local = args.includes('--local');
  result.options.verbose = args.includes('--verbose') || args.includes('-v');

  // Extract message (everything that's not a flag)
  result.message = args
    .slice(1)
    .filter(arg => !arg.startsWith('--') && !arg.startsWith('-'))
    .join(' ');

  return result;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Iris - Integrated Runtime Intelligence Service v1.0.0
==========================================
Multi-provider AI router · 16 providers · MCP server · council · batch APIs · tool calling · mTLS · mDNS

USAGE:
  iris <command> [message] [options]

COMMANDS:
  chat <message> Chat with AI using smart provider selection
  council <message> Fan out to N providers in parallel (Phase E)
  provider list|add|test|remove Manage user-defined providers (agnostic)
  batch submit|get Submit / poll Anthropic + OpenAI batch APIs
  models List available models from all providers
  providers Show provider status and performance statistics
  file <path> Process and analyze a file
  dir <path> Process all files in a directory
  health Check system health and provider status
  status Show comprehensive system status
  serve [--port=8782] Run IRIS as an MCP server (Phase D)
  config save/load [path] Manage configuration files
  session list|new|show|delete Manage persistent conversation sessions
  clear Clear conversation context
  help Show this help message

TASK TYPES:
  --task=code Programming, debugging, code review (Ollama → OpenAI)
  --task=creative Writing, brainstorming, creative tasks (Ollama → Gemini)
  --task=fast Quick questions, simple queries (Ollama → Groq)
  --task=complex Analysis, research, complex reasoning (OpenAI → Ollama)
  --task=reasoning Advanced logical reasoning (OpenAI → Ollama)
  --task=vision Image analysis and description (OpenAI → Ollama)
  --task=ultra_fast Lightning-fast responses (Groq preferred)
  --task=balanced General purpose (default) (Ollama first)

OPTIONS:
  --provider=<name> Force a specific provider — see "iris providers" for the live list
  --providers=a,b,c (council only) Whitelist of providers to poll
  --exclude=a,b (council only) Blacklist of providers to skip
  --timeout=<seconds> (council only) Per-provider timeout, default 60
  --judge=<provider> (council only) Rank the panel via a judge provider
  --session=<id> Continue a persistent conversation session
  --stream Enable streaming responses
  --local Prefer local providers only
  --verbose, -v Enable verbose output
  --help, -h Show this help message

ENVIRONMENT VARIABLES:
  IRIS_DB SQLite path (default: ~/.iris/iris.db)
  IRIS_SESSION Default session id for chat continuity
  IRIS_AUTH_TOKEN Bearer token required by "iris serve" (optional)
  IRIS_LOG_LEVEL trace|debug|info|warn|error (default: info)
  IRIS_LOG_FORMAT pretty|json (default: pretty on TTY, json otherwise)

BUILT-IN PROVIDERS (set the env var to enable):
  Ollama, Groq, OpenAI, Gemini, Claude — primary five
  Kimi (MOONSHOT_API_KEY) Mistral (MISTRAL_API_KEY)
  MiniMax (MINIMAX_API_KEY) Cerebras (CEREBRAS_API_KEY)
  DeepSeek (DEEPSEEK_API_KEY) Together (TOGETHER_API_KEY)
  Grok (XAI_API_KEY) OpenRouter (OPENROUTER_API_KEY)
  Perplexity (PERPLEXITY_API_KEY)
  Cohere (COHERE_API_KEY) HuggingFace (HF_API_KEY)

  Run "iris providers" to see live status and how to enable each.

EXTENDING — add any OTHER OpenAI-compatible service:
  Drop a "type": "openai-compatible" entry into config/iris-config.json
  with baseURL + apiKeyEnv + models. Works with LM Studio, Fireworks,
  llama.cpp/vLLM, SiliconFlow, etc. See ROADMAP.md.

EXAMPLES:
  iris chat "Hello, how are you?"
  iris chat "Write a Python function" --task=code
  iris chat "What is 2+2?" --provider=gemini
  iris chat "Stream me a poem" --stream
  iris council "Best Python lib for date math?" --exclude=ollama
  iris council "Explain X" --providers=claude,openai,gemini --judge=claude
  iris file ./my-script.js --task=code --verbose
  iris providers
  iris health
  iris serve --port=8782 # MCP server for ecosystem/ecosystem use
  iris provider add my-svc --base-url=https://x/v1 --key-env=MY_KEY
  iris batch submit ./reqs.jsonl --provider=anthropic

PROVIDER HIERARCHY (default routing tendencies):
  LOCAL: Ollama (mistral:7b, qwen2.5-coder, qwen3:4b) - free, private
  SPEED: Groq (Llama 4 Scout, GPT OSS 20B at 1000 t/s)
  REASONING: OpenAI (GPT-5.5, o4-mini), Claude Opus 4.8
  CREATIVE: Gemini (3.1 Pro, 3.5 Flash), Claude Sonnet 4.6
  AGENTIC: Cohere (Command A+), tool-calling across all providers

For more information, visit: https://github.com/jordanaftermidnight/multi-ai-integration-CLI
`);
}

/**
 * Enhanced CLI runner with better error handling
 */
async function runCLI() {
  const args = process.argv.slice(2);
  
  // Show help for empty args or help command
  if (args.length === 0 || args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    showHelp();
    return;
  }

  const { command, message, options } = parseArgs(args);

  // Commands that operate purely on local state and never need to talk
  // to a provider. Skipping provider init saves ~3s of cold-start cost.
  const ADMIN_COMMANDS = new Set(['session', 'config', 'clear', 'provider', 'batch']);
  const needsProviders = !ADMIN_COMMANDS.has(command);

  const ai = new MultiAI();

  try {
    if (options.verbose) {
      console.log('Starting Iris CLI...');
    }
    if (needsProviders) {
      await ai.initializeProviders();
    }

    switch (command) {
      case 'chat':
        await handleChatCommand(ai, message, options);
        break;

      case 'providers':
        await handleProvidersCommand(ai, options);
        break;

      case 'provider':
        // Singular: provider add|test|remove|list management
        await handleProviderCommand(ai, args.slice(1), options);
        break;

      case 'models':
        await handleModelsCommand(ai, options);
        break;

      case 'file':
        await handleFileCommand(ai, message, options);
        break;

      case 'dir':
        await handleDirectoryCommand(ai, message, options);
        break;

      case 'health':
        await handleHealthCommand(ai, options);
        break;

      case 'status':
        await handleStatusCommand(ai, options);
        break;

      case 'council':
        await handleCouncilCommand(ai, message, options);
        break;

      case 'batch':
        await handleBatchCommand(ai, args.slice(1), options);
        break;

      case 'serve':
        await handleServeCommand(ai, options);
        break;

      case 'config':
        await handleConfigCommand(ai, args.slice(1), options);
        break;

      case 'session':
        await handleSessionCommand(ai, args.slice(1), options);
        break;

      case 'clear':
        await handleClearCommand(ai, options);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "iris help" to see available commands.');
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    if (options.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Handle chat command
 */
async function handleChatCommand(ai, message, options) {
  if (!message.trim()) {
    console.log('❌ Please provide a message to chat with AI');
    console.log('Usage: iris chat "Your message here" [--task=type]');
    return;
  }

  if (options.stream) {
    return handleStreamingChat(ai, message, options);
  }

  try {
    console.log(`Processing message...`);

    const startTime = Date.now();
    const response = await ai.chat(message, options);
    const duration = Date.now() - startTime;

    console.log(`\n[${response.provider}/${response.model}]`);
    console.log(response.response);

    if (options.verbose) {
      console.log(`\nMetadata:`);
      console.log(` Provider: ${response.provider}`);
      console.log(` Model: ${response.model}`);
      console.log(` Task Type: ${response.taskType}`);
      console.log(` Response Time: ${duration}ms`);
      console.log(` Context Length: ${response.contextLength}`);
      console.log(` Timestamp: ${response.timestamp}`);
    } else {
      console.log(`\nResponse time: ${duration}ms`);
    }

  } catch (error) {
    console.error(`Chat failed: ${error.message}`);
  }
}

async function handleStreamingChat(ai, message, options) {
  try {
    const stream = await ai.streamChat(message, options);
    process.stdout.write(`\n[${stream.provider}/${stream.model}]\n`);
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    const meta = await stream.finalize();
    process.stdout.write('\n');
    if (options.verbose) {
      console.log(`\nResponse time: ${meta.responseTime}ms`);
    }
  } catch (error) {
    console.error(`\nStream failed: ${error.message}`);
  }
}

/**
 * Handle providers command
 */
async function handleProvidersCommand(ai, options) {
  console.log('\nProvider Status & Statistics:');
  
  // Show visual status first
  ai.displayProviderStatus();
  
  if (options.verbose) {
    console.log('\nDetailed Statistics:');
    const stats = ai.router.getProviderStats();

    for (const [provider, data] of Object.entries(stats)) {
      console.log(`\n${provider.toUpperCase()} Statistics:`);
      console.log(` Requests: ${data.requests}`);
      console.log(` Success Rate: ${data.successRate}`);
      console.log(` Avg Response Time: ${data.avgResponseTime?.toFixed(2) || 0}ms`);
      console.log(` Total Cost: $${data.totalCost?.toFixed(4) || '0.0000'}`);
      
      if (data.capabilities) {
        const features = Object.entries(data.capabilities)
          .filter(([_, v]) => v === true)
          .map(([k, _]) => k)
          .join(', ');
        console.log(` Features: ${features || 'None'}`);
      }
    }
    
    console.log('\nUse --task flags to influence provider selection:');
    console.log(' --task=fast → Prioritizes speed (Mistral preferred)');
    console.log(' --task=complex → Uses best reasoning model (Claude/Gemini fallback)');
    console.log(' --task=code → Optimizes for programming tasks');
  }
}

/**
 * Handle models command
 */
async function handleModelsCommand(ai, options) {
  console.log('\nAvailable Models:');
  
  for (const [providerName, provider] of ai.router.providers) {
    try {
      if (provider.isAvailable) {
        console.log(`\n${providerName.toUpperCase()}:`);
        
        if (provider.getAvailableModels) {
          const models = await provider.getAvailableModels();
          models.forEach(model => console.log(` - ${model}`));
        } else if (provider.models) {
          Object.entries(provider.models).forEach(([type, model]) => {
            console.log(` - ${model} (${type})`);
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to get models for ${providerName}: ${error.message}`);
    }
  }
}

/**
 * Handle file command
 */
async function handleFileCommand(ai, filePath, options) {
  if (!filePath.trim()) {
    console.log('❌ Please provide a file path');
    console.log('Usage: iris file <path> [--task=type]');
    return;
  }

  try {
    console.log(`Processing file: ${filePath}`);
    
    const result = await ai.processFile(filePath, options);
    
    console.log(`\n[${result.provider}] Analysis:`);
    console.log(result.response);
    
    if (options.verbose) {
      console.log(`\nFile processed successfully`);
      console.log(` Provider: ${result.provider}`);
      console.log(` Response time: ${result.responseTime}ms`);
    }

  } catch (error) {
    console.error(`File processing failed: ${error.message}`);
  }
}

/**
 * Handle directory command.
 *
 * Walk every file under dirPath (non-recursive — files only, no
 * sub-directories), filter by allowed extensions, and run processFile
 * over each. Aggregates per-file results.
 */
async function handleDirectoryCommand(ai, dirPath, options) {
  if (!dirPath.trim()) {
    console.log('Please provide a directory path');
    console.log('Usage: iris dir <path> [--task=type]');
    return;
  }

  const fs = await import('fs');
  const path = await import('path');
  const allowed = new Set(['.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.md', '.txt', '.json', '.yaml', '.yml', '.toml']);

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    console.error(`Directory not readable: ${error.message}`);
    return;
  }

  const files = entries
    .filter((e) => e.isFile() && allowed.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dirPath, e.name));

  if (files.length === 0) {
    console.log(`No supported files in ${dirPath} (extensions: ${[...allowed].join(' ')})`);
    return;
  }

  console.log(`Processing ${files.length} files from ${dirPath}\n`);
  let ok = 0;
  let fail = 0;
  for (const file of files) {
    try {
      const result = await ai.processFile(file, options);
      console.log(`[${result.provider}] ${path.basename(file)}`);
      console.log(result.response.split('\n').slice(0, 3).map((l) => ` ${l}`).join('\n'));
      console.log('');
      ok++;
    } catch (error) {
      console.error(`FAIL ${path.basename(file)}: ${error.message}`);
      fail++;
    }
  }
  console.log(`${ok} processed, ${fail} failed`);
}

/**
 * Handle health command
 */
async function handleHealthCommand(ai, options) {
  console.log('\nSystem Health Check:');
  
  // Use new visual status display
  ai.displayProviderStatus();
  
  if (options.verbose) {
    const healthChecks = await ai.router.healthCheckAll();
    console.log('\nDetailed Health Information:');

    for (const [provider, health] of Object.entries(healthChecks)) {
      console.log(`\n${provider.toUpperCase()}:`);
      console.log(` Status: ${health.status}`);
      
      if (health.models !== undefined) {
        console.log(` Models: ${health.models}`);
      }
      
      if (health.error) {
        console.log(` Error: ${health.error}`);
      }
      
      if (health.version) {
        console.log(` Version: ${health.version}`);
      }
    }
  }
  
  const status = ai.getProviderStatus();
  if (status.summary.available === 0) {
    console.log('\n⚠️ No providers are currently available. Check your configuration.');
    console.log(' Make sure Ollama is running: ollama serve');
  } else if (!status.ollama.available) {
    console.log('\n⚠️ Primary provider (Mistral) unavailable - using fallback providers');
    console.log(' Start Ollama for cost-optimized operation: ollama serve');
  }
}

/**
 * Handle status command
 */
async function handleStatusCommand(ai, options) {
  console.log('\nComprehensive System Status:');

  const status = await ai.getSystemStatus();

  console.log(`\nSystem Information:`);
  console.log(` Version: ${status.version}`);
  console.log(` Timestamp: ${status.timestamp}`);

  console.log(`\nProviders:`);
  console.log(` Total: ${status.providers.summary.total}`);
  console.log(` Available: ${status.providers.summary.available}`);
  console.log(` Primary: ${status.providers.summary.primary}`);
  
  console.log(`\nResources:`);
  console.log(` Knowledge Base Entries: ${status.resources.knowledgeBase.entries}`);
  console.log(` Context Length: ${status.resources.context.length}/${status.resources.context.maxLength}`);
  console.log(` Memory Usage: ${Math.round(status.resources.knowledgeBase.memoryUsage.heapUsed / 1024 / 1024)}MB`);

  if (options.verbose) {
    console.log(`\nRecent Performance:`);
    status.performance.recentRequests.forEach(req => {
      console.log(` ${req.provider}: ${req.responseTime}ms (${req.success ? 'success' : 'failed'})`);
    });
  }
}

/**
 * Handle config command
 */
async function handleConfigCommand(ai, args, options) {
  const subcommand = args[0];
  const configPath = args[1];

  switch (subcommand) {
    case 'save':
      ai.saveConfig(configPath);
      break;
      
    case 'load':
      console.log('Configuration is automatically loaded on startup');
      break;
      
    default:
      console.log('Usage: iris config save/load [path]');
  }
}

/**
 * Handle session subcommand. Sub-subcommands: list / new / show / delete.
 * iris session list
 * iris session new [id] (UUID if id omitted)
 * iris session show <id>
 * iris session delete <id>
 */
async function handleSessionCommand(ai, args, options) {
  if (!ai.store) {
    console.error('❌ Persistent store unavailable — sessions need IrisStore.');
    return;
  }
  const sub = args[0];
  const arg = args[1];

  switch (sub) {
    case 'list': {
      const sessions = ai.store.listSessions(20);
      if (sessions.length === 0) {
        console.log('No sessions yet. Start one: iris session new');
        return;
      }
      console.log('\nRecent sessions:');
      for (const s of sessions) {
        console.log(` ${s.id.padEnd(36)} last_used=${s.last_used_at}`);
      }
      break;
    }
    case 'new': {
      const id = arg || (await import('crypto')).randomUUID();
      ai.store.createSession(id);
      console.log(`✅ Created session: ${id}`);
      console.log(` Use it with: iris chat "..." --session=${id}`);
      console.log(` Or set: export IRIS_SESSION=${id}`);
      break;
    }
    case 'show': {
      if (!arg) { console.error('Usage: iris session show <id>'); return; }
      const messages = ai.store.getMessages(arg, 50);
      if (messages.length === 0) {
        console.log(`Session ${arg} has no messages yet.`);
        return;
      }
      console.log(`\nSession ${arg}:\n`);
      for (const m of messages) {
        const tag = m.role === 'assistant'
          ? `Assistant [${m.provider || '?'}/${m.model || '?'}]:`
          : 'User:';
        console.log(`${tag} ${m.content}\n`);
      }
      break;
    }
    case 'delete': {
      if (!arg) { console.error('Usage: iris session delete <id>'); return; }
      const ok = ai.store.deleteSession(arg);
      console.log(ok ? `✅ Deleted session ${arg}` : `Session ${arg} not found`);
      break;
    }
    default:
      console.log('Usage: iris session [list|new|show|delete] [id]');
  }
}

/**
 * Handle council command — fan out to N providers, show side-by-side.
 */
async function handleCouncilCommand(ai, message, options) {
  if (!message.trim()) {
    console.log('❌ Please provide a message');
    console.log('Usage: iris council "Your question" [--providers=a,b,c] [--exclude=x] [--task=balanced] [--timeout=60]');
    return;
  }

  const tags = [];
  if (options.judge) tags.push(`judge: ${options.judge}`);
  if (options.merge) tags.push('merge');
  console.log(`Polling council${tags.length ? ` (${tags.join(', ')})` : ''}...`);
  let council;
  try {
    council = await ai.council(message, {
      taskType: options.taskType,
      providers: options.providers,
      exclude: options.exclude,
      timeoutMs: options.timeoutMs,
      judge: options.judge,
      merge: options.merge,
    });
  } catch (error) {
    console.error(`Council failed: ${error.message}`);
    return;
  }

  console.log('');
  council.results.forEach((r, i) => {
    const rankTag = r.judgment ? `#${r.judgment.rank} ` : '';
    const header = r.success
      ? `${rankTag}[${r.provider}/${r.model}] (${r.latencyMs}ms, $${(r.cost || 0).toFixed(6)})`
      : `[${r.provider}] (${r.latencyMs}ms, FAILED)`;
    console.log(header);
    if (r.judgment?.reason) console.log(` judge: ${r.judgment.reason}`);
    console.log(r.response || ` error: ${r.error}`);
    console.log('');
  });

  if (council.judge) {
    if (council.judge.error) {
      console.log(`Judge ${council.judge.provider} failed: ${council.judge.error}`);
    } else if (council.judge.note) {
      console.log(`Judge: ${council.judge.note}`);
    } else if (!council.judge.ranking) {
      console.log(`Judge ${council.judge.provider} returned unparseable output — keeping original order.`);
    }
  }

  const ok = council.results.filter((r) => r.success).length;
  const fail = council.results.length - ok;
  const failNote = fail > 0 ? `, ${fail} failed` : '';
  console.log(`${ok} response${ok === 1 ? '' : 's'}${failNote}, council wall-clock ${council.totalLatencyMs}ms, total cost $${council.totalCost.toFixed(6)}`);

  if (council.merged) {
    console.log('\n--- merged ---');
    console.log(council.merged);
  }
}

/**
 * Handle `iris batch submit <file.jsonl>` and `iris batch get <id>`.
 *
 * Submit: input is a JSONL file where each line is either:
 * {"customId": "...", "message": "..."} ← shorthand
 * {"customId": "...", "messages": [{"role","content"}]} ← full
 *
 * Get: --provider=anthropic|openai required.
 */
async function handleBatchCommand(ai, args, options) {
  const fs = await import('node:fs');
  const sub = args[0];
  const arg = args[1];
  const provider = _findArg(args, '--provider') || 'anthropic';
  const model = _findArg(args, '--model');

  if (sub === 'submit') {
    if (!arg) { console.error('Usage: iris batch submit <file.jsonl> [--provider=anthropic|openai] [--model=X]'); return; }
    if (!fs.existsSync(arg)) { console.error(`File not found: ${arg}`); return; }
    const requests = fs.readFileSync(arg, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    console.log(`Submitting ${requests.length} requests to ${provider} batch...`);
    try {
      const handle = await ai.submitBatch(requests, { provider, model });
      console.log(JSON.stringify(handle, null, 2));
      console.log(`\nPoll with: iris batch get ${handle.batchId} --provider=${provider}`);
    } catch (e) {
      console.error(`batch submit failed: ${e.message}`);
    }
    return;
  }

  if (sub === 'get') {
    if (!arg) { console.error('Usage: iris batch get <batchId> --provider=anthropic|openai'); return; }
    try {
      const handle = await ai.getBatch(arg, { provider });
      console.log(JSON.stringify(handle, null, 2));
    } catch (e) {
      console.error(`batch get failed: ${e.message}`);
    }
    return;
  }

  console.log('Usage: iris batch [submit|get] ...');
  console.log(' iris batch submit ./requests.jsonl --provider=anthropic');
  console.log(' iris batch get <batchId> --provider=anthropic');
}

/**
 * Handle `iris provider <subcommand>` — manage user-defined providers
 * without editing JSON by hand.
 *
 * iris provider list
 * iris provider add <name> --base-url=URL [--key-env=ENV] [--key=VALUE]
 * [--type=openai-compatible] [--priority=N]
 * [--allow-no-auth] [--description="..."]
 * iris provider test <name>
 * iris provider remove <name>
 *
 * Writes to config/iris-config.json under providers.<name>. Refuses to
 * touch built-in names (kimi, deepseek, etc.) — those route through the
 * registry; override them via the existing config-file merge path.
 */
async function handleProviderCommand(ai, args, options) {
  const fs = await import('node:fs');
  const sub = args[0];
  const name = args[1];
  const configPath = './config/iris-config.json';
  const reservedNames = new Set([
    'ollama', 'groq', 'openai', 'gemini', 'claude',
    'kimi', 'minimax', 'deepseek', 'grok', 'mistral', 'cerebras',
    'together', 'openrouter', 'perplexity', 'cohere', 'huggingface',
  ]);

  const readConfig = () => {
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  };
  const writeConfig = (cfg) => {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
  };

  switch (sub) {
    case 'list': {
      const cfg = readConfig();
      const customs = Object.entries(cfg.providers || {})
        .filter(([n, p]) => p?.type === 'openai-compatible');
      if (customs.length === 0) {
        console.log('No custom providers. Add one with: iris provider add <name> --base-url=...');
        return;
      }
      console.log('Custom (user-defined) providers:\n');
      for (const [n, p] of customs) {
        const keyHint = p.apiKeyEnv ? `env:${p.apiKeyEnv}` : (p.allowNoAuth ? 'no-auth' : 'inline key');
        console.log(` ${n.padEnd(20)} ${p.baseURL} (${keyHint})`);
      }
      return;
    }

    case 'add': {
      if (!name) {
        console.error('Usage: iris provider add <name> --base-url=URL [--key-env=ENV] [--type=openai-compatible]');
        return;
      }
      if (reservedNames.has(name)) {
        console.error(`"${name}" is reserved (built-in). Override built-ins via providers.${name} in config — same name, deep-merges.`);
        return;
      }
      // Parse args for this subcommand.
      const baseURL = _findArg(args, '--base-url');
      const keyEnv = _findArg(args, '--key-env');
      const keyInline = _findArg(args, '--key');
      const type = _findArg(args, '--type') || 'openai-compatible';
      const description = _findArg(args, '--description');
      const priorityStr = _findArg(args, '--priority');
      const allowNoAuth = args.includes('--allow-no-auth');

      if (!baseURL) {
        console.error('Missing --base-url=URL');
        return;
      }
      if (!keyEnv && !keyInline && !allowNoAuth) {
        console.error('Need one of: --key-env=ENV_NAME, --key=VALUE, or --allow-no-auth');
        return;
      }
      const entry = { type, baseURL };
      if (keyEnv) entry.apiKeyEnv = keyEnv;
      if (keyInline) entry.apiKey = keyInline;
      if (allowNoAuth) entry.allowNoAuth = true;
      if (priorityStr) entry.priority = Number(priorityStr);
      if (description) entry.description = description;
      // Sensible default model map: caller can edit the JSON to tune.
      entry.models = { balanced: 'default' };

      const cfg = readConfig();
      cfg.providers = cfg.providers || {};
      if (cfg.providers[name]) {
        console.error(`provider "${name}" already exists in ${configPath} — remove it first or edit the file directly`);
        return;
      }
      cfg.providers[name] = entry;
      writeConfig(cfg);
      console.log(`Added provider "${name}" → ${baseURL}`);
      console.log(`Next: edit config/iris-config.json to set the real models map, then \`iris provider test ${name}\``);
      return;
    }

    case 'remove': {
      if (!name) { console.error('Usage: iris provider remove <name>'); return; }
      if (reservedNames.has(name)) {
        console.error(`"${name}" is reserved (built-in) — cannot remove via CLI. Set { disabled: true } in config to skip it.`);
        return;
      }
      const cfg = readConfig();
      if (!cfg.providers?.[name]) { console.error(`provider "${name}" not found`); return; }
      delete cfg.providers[name];
      writeConfig(cfg);
      console.log(`Removed provider "${name}"`);
      return;
    }

    case 'test': {
      if (!name) { console.error('Usage: iris provider test <name>'); return; }
      // Need providers initialized to test.
      if (!ai.initialized) await ai.initializeProviders();
      const provider = ai.router.providers.get(name);
      if (!provider) {
        console.error(`provider "${name}" not registered. Available: ${Array.from(ai.router.providers.keys()).join(', ')}`);
        return;
      }
      console.log(`Testing ${name} via isAvailable()...`);
      const t0 = Date.now();
      let ok;
      try {
        ok = await provider.isAvailable();
      } catch (e) {
        console.error(`test threw: ${e.message}`);
        return;
      }
      const elapsed = Date.now() - t0;
      console.log(ok
        ? `${name} is available (${elapsed}ms)`
        : `${name} is not available (${elapsed}ms) — check API key and network`);
      return;
    }

    default:
      console.log('Usage: iris provider [list|add|test|remove] [name] [flags]');
      console.log(' iris provider add my-svc --base-url=https://example.com/v1 --key-env=MY_KEY');
      console.log(' iris provider test my-svc');
      console.log(' iris provider remove my-svc');
  }
}

function _findArg(args, prefix) {
  const a = args.find((x) => x.startsWith(`${prefix}=`));
  return a ? a.slice(prefix.length + 1) : null;
}

/**
 * Handle serve command — boot the MCP server.
 */
async function handleServeCommand(ai, options) {
  const { IrisMcpServer } = await import('./server/iris-mcp-server.js');
  const cfg = ai.config.server || {};
  const authToken = process.env[cfg.authTokenEnv || 'IRIS_AUTH_TOKEN'] || cfg.authToken || null;

  const server = new IrisMcpServer({
    ai,
    port: options.port ? Number(options.port) : (cfg.port || 8782),
    host: options.host || cfg.host || '127.0.0.1',
    authToken,
    agentId: cfg.agentId || 'iris',
    metricsEnabled: cfg.metricsEnabled !== false,
    maxEventStreams: cfg.maxEventStreams || 100,
    drainSeconds: options.drainSeconds ?? cfg.drainSeconds ?? 10,
    corsOrigin: cfg.corsOrigin || null,
    auditLogPath: cfg.auditLogPath,
    mdnsEnabled: options.mdns ?? cfg.mdnsEnabled ?? false,
    tls: cfg.tls || null,
  });

  await server.start();

  // Idempotent shutdown — multiple SIGINTs (e.g. impatient Ctrl+C+C)
  // don't kick off competing drains.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) {
      // Second signal — bail hard.
      console.error(`Got ${signal} during drain — forcing exit`);
      process.exit(130);
    }
    shuttingDown = true;
    console.log(`\nGot ${signal}, draining (up to ${server.drainMs}ms)...`);
    try {
      const result = await server.stop();
      if (!result.drained) {
        console.error(`Warning: ${result.inFlight} in-flight call(s) abandoned at deadline`);
      }
    } catch (err) {
      console.error('Shutdown error:', err.message);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Hold the process open; the http server is keeping the loop alive.
  await new Promise(() => {});
}

/**
 * Handle clear command
 */
async function handleClearCommand(ai, options) {
  ai.clearContext();
  console.log('✅ Conversation context cleared');
  
  if (options.verbose) {
    console.log('All conversation history has been removed from memory.');
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}

export { runCLI };