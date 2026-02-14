#!/usr/bin/env node
// DEPRECATED — Use run-agent.mjs instead
// This file is kept for compatibility but new code should use the unified runner

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const agentId = process.argv[2];

if (!agentId) {
  console.log('⚠️  DEPRECATED: Use run-agent.mjs instead');
  console.log('');
  console.log('Usage: node orchestrator/run-agent.mjs <agent-id>');
  console.log('');
  console.log('Available agents:');
  const { listAgents } = await import('./agent-loader.mjs');
  const agents = await listAgents();
  agents.forEach(a => console.log(`  - ${a.id}: ${a.name} (${a.enabled ? 'enabled' : 'disabled'})`));
  process.exit(1);
}

console.log('⚠️  DEPRECATED: Dispatching via run-agent.mjs');

// Forward to new runner
const child = spawn('node', [
  path.join(__dirname, 'run-agent.mjs'),
  agentId,
  ...process.argv.slice(3)
], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

child.on('exit', (code) => {
  process.exit(code);
});
