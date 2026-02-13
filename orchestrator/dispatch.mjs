#!/usr/bin/env node
// Orchestrator — dispatches agent tasks via OpenClaw sessions_spawn
// Usage: node dispatch.mjs <agent-id> [task-args...]

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(__dirname, '..', 'agents');

async function loadAgent(agentId) {
  const configPath = path.join(AGENTS_DIR, agentId, 'agent.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  return { id: agentId, ...config };
}

async function dispatch(agentId, args = []) {
  const agent = await loadAgent(agentId);
  
  console.log(`Dispatching agent: ${agent.name} (${agent.id})`);
  console.log(`Model: ${agent.model}, Timeout: ${agent.timeout}s`);
  
  // Build the task message for sessions_spawn
  const task = buildTask(agent, args);
  
  // Note: This would call sessions_spawn, but we can't import it here
  // Instead this logs what would be dispatched
  console.log('Task payload:');
  console.log(JSON.stringify(task, null, 2));
  
  // Return task for manual dispatch via Jarvis
  return task;
}

function buildTask(agent, args) {
  switch (agent.id) {
    case 'blog-bot':
      return {
        task: `Publish today's SME-focused VoiceHub blog post directly to main.

Repo: ${agent.repo}
Strict quality: ${agent.inputs.strict_quality}
Target words: ${agent.inputs.word_count}

1) cd ${agent.repo}
2) git checkout main && git pull --ff-only origin main
3) BLOG_IMAGE=auto BLOG_CONTENT_MODE=seo BLOG_TARGET_WORDS=${agent.inputs.word_count} BLOG_STRICT_QUALITY=${agent.inputs.strict_quality} node scripts/blog/publish-post.mjs "<GENERATED_TITLE>"
4) git add data/generated-blog-posts.json public/blog
5) git commit -m "chore(blog): publish $(date +%Y-%m-%d)"
6) git push origin main`,
        model: agent.model,
        timeoutSeconds: agent.timeout
      };
      
    case 'scout-alpha':
      return {
        task: `Lead Scout mission for VoiceHub.

Find 10 high-intent prospects using these sources:
- Reddit: r/smallbusiness, r/entrepreneur (keywords: "missed calls", "receptionist", "call handling")
- Job boards: Indeed, LinkedIn ("receptionist", "call center" job posts)
- Twitter: "hiring receptionist", "need answering service"

For each prospect:
1. Extract company name and website
2. Find contact email (CEO/founder preferred)
3. Draft personalized cold email (3 sentences max)
4. Score: hot/warm/cold based on urgency

Output: JSON with prospects array.
Save to: /data/.openclaw/workspace/voicehub-agents/memory/scout-alpha/

DO NOT send emails — only research and draft.`,
        model: agent.model,
        timeoutSeconds: agent.timeout
      };
      
    default:
      return {
        task: `Run agent: ${agent.name}\nConfig: ${JSON.stringify(agent)}`,
        model: agent.model,
        timeoutSeconds: agent.timeout
      };
  }
}

// CLI
const agentId = process.argv[2];
const args = process.argv.slice(3);

if (!agentId) {
  console.log('Usage: node dispatch.mjs <agent-id> [args...]');
  console.log('\nAvailable agents:');
  const dirs = await fs.readdir(AGENTS_DIR);
  for (const dir of dirs) {
    const stat = await fs.stat(path.join(AGENTS_DIR, dir));
    if (stat.isDirectory()) {
      try {
        const cfg = await loadAgent(dir);
        console.log(`  ${dir}: ${cfg.name} (${cfg.enabled ? 'enabled' : 'disabled'})`);
      } catch {}
    }
  }
  process.exit(1);
}

await dispatch(agentId, args);
