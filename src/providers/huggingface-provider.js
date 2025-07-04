#!/usr/bin/env node

/**
 * Hugging Face Transformers Provider
 * Local models via Hugging Face Transformers.js
 * No API keys needed - runs entirely local
 */

let pipeline = null;
let env = null;

try {
  // Try to import Transformers.js
  const transformers = await import('@xenova/transformers');
  pipeline = transformers.pipeline;
  env = transformers.env;
  
  // Configure to run locally
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
} catch (error) {
  // Will be handled in constructor
}

export class HuggingFaceProvider {
  constructor(options = {}) {
    this.name = 'huggingface';
    this.available = !!pipeline;
    this.models = {
      fast: 'Xenova/distilbert-base-uncased',
      coding: 'Xenova/CodeBERTa-small-v1',
      text: 'Xenova/gpt2',
      sentiment: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      summarization: 'Xenova/distilbart-cnn-6-6',
      translation: 'Xenova/opus-mt-en-fr'
    };
    
    this.priority = 3;
    this.costPerToken = 0; // Completely free
    this.pipes = new Map();
  }

  async isAvailable() {
    return this.available;
  }

  async ensurePipeline(task, model) {
    const key = `${task}:${model}`;
    if (!this.pipes.has(key)) {
      try {
        const pipe = await pipeline(task, model);
        this.pipes.set(key, pipe);
        return pipe;
      } catch (error) {
        console.warn(`Failed to load HF model ${model}:`, error.message);
        return null;
      }
    }
    return this.pipes.get(key);
  }

  async chat(message, options = {}) {
    try {
      // Use text generation for chat
      const generator = await this.ensurePipeline('text-generation', this.models.text);
      if (!generator) {
        throw new Error('Text generation model not available');
      }

      const result = await generator(message, {
        max_new_tokens: options.max_tokens || 100,
        temperature: options.temperature || 0.7,
        do_sample: true
      });

      return {
        content: result[0].generated_text,
        model: this.models.text,
        provider: this.name
      };
    } catch (error) {
      throw new Error(`HuggingFace chat error: ${error.message}`);
    }
  }

  async getAvailableModels() {
    return Object.values(this.models);
  }

  getCapabilities() {
    return {
      chat: true,
      streaming: false,
      multimodal: false,
      reasoning: true,
      coding: true,
      math: false,
      creative: true,
      maxTokens: 1024,
      languages: ['en', 'fr', 'de', 'es'],
      specialties: ['text-generation', 'summarization', 'translation', 'sentiment']
    };
  }
}