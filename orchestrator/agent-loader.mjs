#!/usr/bin/env node
// Agent Loader — loads and validates agent configurations

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_ROOT = path.join(__dirname, '..', 'agents');

export async function loadAgent(agentId) {
  const agentPath = path.join(AGENTS_ROOT, agentId, 'agent.json');
  
  try {
    const content = await fs.readFile(agentPath, 'utf8');
    const config = JSON.parse(content);
    
    // Validate required fields
    const required = ['id', 'name', 'model', 'workflow'];
    const missing = required.filter(f => !config[f]);
    if (missing.length > 0) {
      throw new Error(`Agent ${agentId} missing required fields: ${missing.join(', ')}`);
    }
    
    // Add computed properties
    config._paths = {
      root: path.join(AGENTS_ROOT, agentId),
      memory: path.join(AGENTS_ROOT, agentId, 'memory'),
      outputs: path.join(AGENTS_ROOT, agentId, 'outputs'),
      tasks: path.join(AGENTS_ROOT, agentId, 'tasks'),
      config: path.join(AGENTS_ROOT, agentId, 'config'),
    };
    
    config._loaded = new Date().toISOString();
    
    return config;
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`Agent not found: ${agentId}`);
    }
    throw new Error(`Failed to load agent ${agentId}: ${e.message}`);
  }
}

export async function listAgents() {
  const entries = await fs.readdir(AGENTS_ROOT, { withFileTypes: true });
  const agents = [];
  
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      try {
        const config = await loadAgent(entry.name);
        agents.push({
          id: config.id,
          name: config.name,
          enabled: config.enabled ?? false,
          schedule: config.schedule ?? 'manual',
        });
      } catch {
        // Skip invalid agents
      }
    }
  }
  
  return agents;
}

export async function getAgentStatus(agentId) {
  const agent = await loadAgent(agentId);
  
  // Check for today's memory files
  const today = new Date().toISOString().split('T')[0];
  const memoryPath = path.join(agent._paths.memory, today);
  
  try {
    const files = await fs.readdir(memoryPath);
    const hasOutput = files.length > 0;
    
    return {
      ...agent,
      status: hasOutput ? 'completed' : 'pending',
      lastRun: hasOutput ? 'today' : 'never',
      outputs: files,
    };
  } catch {
    return {
      ...agent,
      status: 'pending',
      lastRun: 'never',
      outputs: [],
    };
  }
}

// CLI: list agents
if (process.argv[2] === 'list') {
  const agents = await listAgents();
  console.table(agents);
}
