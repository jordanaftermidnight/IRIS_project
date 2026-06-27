/**
 * Batch APIs — submit many requests asynchronously, pay ~50% less,
 * results come back hours later (Anthropic SLA: 24h, OpenAI: 24h).
 *
 * Use when: nightly analytics, eval sweeps, content-generation queues,
 * any non-interactive bulk processing.
 *
 * Two backends supported:
 *
 * - anthropic: inline JSON body — submit returns immediately with
 * batch id, poll via getBatch(id), fetch via batch.results() once
 * processing_status === 'ended'.
 *
 * - openai: file upload dance — IRIS serializes requests to a JSONL
 * tempfile, uploads via files.create, creates batch via
 * batches.create with completion_window '24h'.
 *
 * IRIS request shape (caller passes this):
 * { customId, message OR messages, taskType?, maxTokens?, ... }
 *
 * Returned batch handle:
 * { batchId, provider, status, submittedAt, requestCount, statusUrl? }
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getLogger } from './logger.js';

const log = getLogger({ component: 'batch' });

/**
 * Submit a batch to the named provider.
 *
 * @param {Object} args
 * @param {import('./ai-router.js').AIRouter} args.router
 * @param {string} args.provider 'anthropic' or 'openai'
 * @param {Array<Object>} args.requests IRIS request shape (see above)
 * @param {string} [args.model] override the model per-batch
 * @returns {Promise<Object>} batch handle
 */
export async function submitBatch({ router, provider, requests, model }) {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error('submitBatch: requests must be a non-empty array');
  }
  const p = router.providers.get(provider);
  if (!p) throw new Error(`submitBatch: provider "${provider}" not registered`);
  if (!p.client) throw new Error(`submitBatch: provider "${provider}" has no SDK client`);

  if (provider === 'anthropic' || provider === 'claude') {
    return _submitAnthropic({ provider: p, requests, model });
  }
  if (provider === 'openai') {
    return _submitOpenAI({ provider: p, requests, model });
  }
  throw new Error(`submitBatch: provider "${provider}" doesn't have a batch API; use anthropic or openai`);
}

/**
 * Get batch status (and results when ready).
 * Returns: { batchId, provider, status, results?, errors?, counts? }
 */
export async function getBatch({ router, provider, batchId }) {
  const p = router.providers.get(provider) || router.providers.get('claude');
  if (!p) throw new Error(`getBatch: provider "${provider}" not registered`);

  if (provider === 'anthropic' || provider === 'claude') {
    return _getAnthropic({ provider: p, batchId });
  }
  if (provider === 'openai') {
    return _getOpenAI({ provider: p, batchId });
  }
  throw new Error(`getBatch: provider "${provider}" doesn't have a batch API`);
}

// ---- Anthropic (Message Batches) ----

async function _submitAnthropic({ provider, requests, model }) {
  const targetModel = model || provider.models?.balanced || 'claude-sonnet-4-6';
  const anthropicReqs = requests.map((r) => {
    const messages = Array.isArray(r.messages)
      ? r.messages.filter((m) => m.role !== 'system')
      : [{ role: 'user', content: r.message }];
    const system = Array.isArray(r.messages)
      ? r.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
      : (r.system || undefined);
    return {
      custom_id: r.customId || `req-${Math.random().toString(36).slice(2, 10)}`,
      params: {
        model: r.model || targetModel,
        max_tokens: r.maxTokens || 4096,
        ...(system ? { system } : {}),
        messages,
      },
    };
  });

  // Anthropic SDK exposes batches under `messages.batches` (beta on older
  // versions, GA on current). Try both paths to be robust.
  const batchesApi = provider.client.messages?.batches || provider.client.beta?.messages?.batches;
  if (!batchesApi) throw new Error('Anthropic SDK does not expose messages.batches — upgrade @anthropic-ai/sdk');

  const batch = await batchesApi.create({ requests: anthropicReqs });
  log.info({ batchId: batch.id, count: requests.length }, 'anthropic batch submitted');
  return {
    batchId: batch.id,
    provider: 'anthropic',
    status: batch.processing_status || 'in_progress',
    submittedAt: batch.created_at,
    requestCount: requests.length,
  };
}

async function _getAnthropic({ provider, batchId }) {
  const batchesApi = provider.client.messages?.batches || provider.client.beta?.messages?.batches;
  if (!batchesApi) throw new Error('Anthropic SDK does not expose messages.batches');

  const batch = await batchesApi.retrieve(batchId);
  const handle = {
    batchId,
    provider: 'anthropic',
    status: batch.processing_status,
    counts: batch.request_counts,
  };

  if (batch.processing_status !== 'ended') return handle;

  // Results are streamed JSONL.
  const results = [];
  for await (const entry of await batchesApi.results(batchId)) {
    results.push({
      customId: entry.custom_id,
      ok: entry.result?.type === 'succeeded',
      response: entry.result?.message?.content?.[0]?.text || null,
      error: entry.result?.error || null,
      raw: entry,
    });
  }
  handle.results = results;
  return handle;
}

// ---- OpenAI (Batches — file upload) ----

async function _submitOpenAI({ provider, requests, model }) {
  const targetModel = model || provider.models?.balanced || 'gpt-5.4';
  const jsonl = requests.map((r) => {
    const customId = r.customId || `req-${Math.random().toString(36).slice(2, 10)}`;
    const messages = Array.isArray(r.messages)
      ? r.messages
      : [{ role: 'user', content: r.message }];
    return JSON.stringify({
      custom_id: customId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: r.model || targetModel,
        messages,
        max_tokens: r.maxTokens || 2000,
      },
    });
  }).join('\n');

  // Pass JSONL as an in-memory File (Node 20+ has global File). Avoids
  // a race where a lazy ReadStream tries to open the file after we have
  // cleaned it up. OpenAI SDK accepts both shapes; this is simpler.
  const fileBlob = new File(
    [Buffer.from(jsonl, 'utf8')],
    'requests.jsonl',
    { type: 'application/jsonl' });
  const file = await provider.client.files.create({
    file: fileBlob,
    purpose: 'batch',
  });
  const batch = await provider.client.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
  });
  log.info({ batchId: batch.id, count: requests.length, fileId: file.id }, 'openai batch submitted');
  return {
    batchId: batch.id,
    provider: 'openai',
    status: batch.status,
    submittedAt: batch.created_at,
    requestCount: requests.length,
    inputFileId: file.id,
  };
}

async function _getOpenAI({ provider, batchId }) {
  const batch = await provider.client.batches.retrieve(batchId);
  const handle = {
    batchId,
    provider: 'openai',
    status: batch.status,
    counts: batch.request_counts,
  };

  if (batch.status !== 'completed') return handle;
  if (!batch.output_file_id) return handle;

  // Download the output file and parse JSONL.
  const file = await provider.client.files.content(batch.output_file_id);
  const text = typeof file.text === 'function' ? await file.text() : String(file);
  const results = text.trim().split('\n').filter(Boolean).map((line) => {
    const r = JSON.parse(line);
    return {
      customId: r.custom_id,
      ok: !r.error,
      response: r.response?.body?.choices?.[0]?.message?.content || null,
      error: r.error || r.response?.body?.error || null,
      raw: r,
    };
  });
  handle.results = results;
  return handle;
}

// Exported for tests.
export const _internals = { _submitAnthropic, _getAnthropic, _submitOpenAI, _getOpenAI };
