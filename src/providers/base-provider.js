/**
 * BaseProvider — shared scaffolding for all IRIS providers.
 *
 * Subclasses must implement:
 * - _doChat(payload, options) → { response, model, usage:{...} }
 * - _doStream(payload, options) → async iterable yielding text chunks
 * - _ping() → throws if unreachable
 *
 * Payload is normalized first via _normalizePayload({messages,...}).
 * The base class handles: prompt selection, model selection, cost
 * calculation, conversation-vs-single dispatch, healthCheck, and the
 * standardized return envelope.
 */
export class BaseProvider {
  /**
   * @param {Object} cfg
   * @param {string} cfg.name Required. Used everywhere.
   * @param {number} [cfg.priority=10] Lower = preferred.
   * @param {Object} [cfg.models] { taskType: modelName }
   * @param {Object} [cfg.rates] { modelName: {input,output} }
   * @param {Object} [cfg.prompts] { taskType: systemPrompt }
   * @param {Object} [cfg.capabilities] Merged onto base capabilities.
   * @param {number} [cfg.costPerToken=0] Heuristic for router scoring.
   * @param {string} [cfg.description]
   */
  constructor(cfg = {}) {
    if (!cfg.name) throw new Error('BaseProvider: name is required');
    this.name = cfg.name;
    this.priority = cfg.priority ?? 10;
    this.models = { ...(cfg.models || {}) };
    this.rates = { ...(cfg.rates || {}) };
    this.prompts = { ...DEFAULT_PROMPTS, ...(cfg.prompts || {}) };
    this._capabilitiesOverride = cfg.capabilities || {};
    this.costPerToken = typeof cfg.costPerToken === 'number' ? cfg.costPerToken : 0;
    this.description = cfg.description || cfg.name;
  }

  selectModel(taskType) {
    return (
      this.models[taskType] ||
      this.models.balanced ||
      Object.values(this.models)[0]
    );
  }

  getSystemPrompt(taskType) {
    return this.prompts[taskType] || this.prompts.balanced;
  }

  async getAvailableModels() {
    return Object.values(this.models);
  }

  /**
   * Per-model cost. Falls back to the first known rate, then 0.
   */
  _calcCost(modelName, inputTokens, outputTokens) {
    const rate = this.rates[modelName] || Object.values(this.rates)[0];
    if (!rate) return 0;
    const inT = inputTokens || 0;
    const outT = outputTokens || 0;
    return inT * (rate.input || 0) + outT * (rate.output ?? rate.input ?? 0);
  }

  /**
   * Normalize incoming chat arguments into a messages array.
   *
   * Accepts EITHER:
   * chat("hello", {taskType})
   * chat({messages: [{role,content},...], taskType})
   * chat({message: "hi", history: [...]}) ← legacy bridge
   *
   * Returns { messages, taskType, options } where messages is always
   * the normalized list including the final user turn.
   */
  _normalizePayload(messageOrPayload, options = {}) {
    let messages;
    let taskType;
    let opts = options || {};

    if (typeof messageOrPayload === 'string') {
      messages = [{ role: 'user', content: messageOrPayload }];
      taskType = opts.taskType || 'balanced';
    } else if (messageOrPayload && typeof messageOrPayload === 'object') {
      opts = { ...messageOrPayload, ...opts };
      taskType = opts.taskType || 'balanced';
      if (Array.isArray(opts.messages)) {
        messages = opts.messages.slice();
      } else if (typeof opts.message === 'string') {
        const history = Array.isArray(opts.history) ? opts.history : [];
        messages = [...history, { role: 'user', content: opts.message }];
      } else {
        throw new Error(`${this.name}: chat() requires "message" or "messages"`);
      }
    } else {
      throw new Error(`${this.name}: chat() requires a string or payload object`);
    }

    return { messages, taskType, options: opts };
  }

  /**
   * Public entry. Subclasses implement _doChat.
   */
  async chat(messageOrPayload, options = {}) {
    const { messages, taskType, options: opts } = this._normalizePayload(messageOrPayload, options);
    const modelName = opts.model || this.selectModel(taskType);
    const result = await this._doChat({ messages, modelName, taskType }, opts);

    return this._buildResult({ result, modelName, taskType });
  }

  async streamChat(messageOrPayload, options = {}) {
    const { messages, taskType, options: opts } = this._normalizePayload(messageOrPayload, options);
    const modelName = opts.model || this.selectModel(taskType);
    return this._doStream({ messages, modelName, taskType }, opts);
  }

  _buildResult({ result, modelName, taskType }) {
    const inputTokens = result.inputTokens || result.usage?.promptTokens || result.usage?.inputTokens || 0;
    const outputTokens = result.outputTokens || result.usage?.completionTokens || result.usage?.outputTokens || 0;
    const cost = typeof result.cost === 'number'
      ? result.cost
      : this._calcCost(modelName, inputTokens, outputTokens);

    const envelope = {
      response: result.response,
      model: modelName,
      provider: this.name,
      taskType,
      timestamp: new Date().toISOString(),
      usage: {
        inputTokens,
        outputTokens,
        promptTokens: inputTokens, // alias for OpenAI-style consumers
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: parseFloat(cost.toFixed(8)),
      },
      ...(result.extra || {}),
    };

    // Tool calling (Commit B): surface structured tool_calls when the
    // provider's response wants to invoke a function. Normalized to
    // OpenAI's shape: [{id, type:'function', function:{name, arguments}}].
    if (Array.isArray(result.toolCalls) && result.toolCalls.length > 0) {
      envelope.toolCalls = result.toolCalls;
      envelope.finishReason = result.finishReason || 'tool_calls';
    } else if (result.finishReason) {
      envelope.finishReason = result.finishReason;
    }

    return envelope;
  }

  async isAvailable() {
    try {
      await this._ping();
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      await this._ping();
      return {
        status: 'healthy',
        provider: this.name,
        models: Object.values(this.models).length,
        responseTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.name,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getCapabilities() {
    return {
      chat: true,
      stream: true,
      vision: false,
      functions: false,
      cost: 'medium',
      speed: 'medium',
      privacy: 'cloud',
      ...this._capabilitiesOverride,
    };
  }
}

const DEFAULT_PROMPTS = {
  code: 'You are an expert software engineer. Provide clean, well-documented code with best practices.',
  creative: 'You are a creative AI assistant. Generate original, engaging content.',
  fast: 'You are an efficient AI assistant. Provide concise, accurate responses.',
  complex: 'You are an expert analyst. Break down complex problems systematically.',
  reasoning: 'You are a logical reasoning expert. Think step-by-step and show your work.',
  analysis: 'You are a data analyst. Provide insights and actionable recommendations.',
  vision: 'You are a vision-capable AI assistant. Describe and analyze visual content accurately.',
  balanced: 'You are a knowledgeable AI assistant. Provide helpful, well-reasoned responses.',
};

export default BaseProvider;
