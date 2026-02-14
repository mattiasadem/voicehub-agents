#!/usr/bin/env node
// Event Bus — enables agent-to-agent communication
// Scout finds prospects → triggers Reach-3 automatically

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_ROOT = path.join(__dirname, '..', 'memory', 'events');

// Event registry: what triggers what
const TRIGGERS = {
  'scout.completed': {
    condition: (result) => result.hotCount >= 2,
    target: 'reach-3',
    priority: 'high',
    delay: 0,
  },
  'blog.published': {
    condition: () => true,
    target: 'ghost-9',
    priority: 'normal',
    delay: 0,
  },
  'prospect.hot': {
    condition: () => true,
    target: 'reach-3',
    priority: 'urgent',
    delay: 0,
  },
  'competitor.changed': {
    condition: (result) => result.changeType === 'pricing',
    target: 'intel-9',
    priority: 'urgent',
    delay: 0,
  },
  'health.at-risk': {
    condition: (result) => result.riskScore > 70,
    target: 'health-5',
    priority: 'urgent',
    delay: 0,
  },
};

export async function emitEvent(eventType, payload = {}) {
  const event = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
    id: `${eventType}-${Date.now()}`,
  };
  
  // Save event to memory
  const today = new Date().toISOString().split('T')[0];
  const eventPath = path.join(EVENTS_ROOT, today);
  await fs.mkdir(eventPath, { recursive: true });
  
  const filename = `${event.id}.json`;
  await fs.writeFile(
    path.join(eventPath, filename),
    JSON.stringify(event, null, 2)
  );
  
  console.log(`[EventBus] Emitted: ${eventType}`);
  
  // Check triggers
  const trigger = TRIGGERS[eventType];
  if (trigger && trigger.condition(payload)) {
    console.log(`[EventBus] Triggering ${trigger.target} (priority: ${trigger.priority})`);
    await scheduleAgent(trigger.target, payload, trigger.priority);
  }
  
  return event;
}

export async function scheduleAgent(agentId, input = {}, priority = 'normal') {
  const today = new Date().toISOString().split('T')[0];
  const scheduledPath = path.join(EVENTS_ROOT, 'scheduled', today);
  await fs.mkdir(scheduledPath, { recursive: true });
  
  const schedule = {
    agent: agentId,
    input,
    priority,
    scheduledAt: new Date().toISOString(),
    status: 'pending',
    id: `schedule-${Date.now()}`,
  };
  
  await fs.writeFile(
    path.join(scheduledPath, `${schedule.id}.json`),
    JSON.stringify(schedule, null, 2)
  );
  
  console.log(`[EventBus] Scheduled: ${agentId} (${priority})`);
  
  // If urgent, run immediately via subprocess
  if (priority === 'urgent') {
    runAgentNow(agentId, input);
  }
  
  return schedule;
}

async function runAgentNow(agentId, input) {
  const scriptPath = path.join(__dirname, 'run-agent.mjs');
  
  const child = spawn('node', [scriptPath, agentId, '--input', JSON.stringify(input)], {
    detached: true,
    stdio: 'ignore',
  });
  
  child.unref();
  
  console.log(`[EventBus] Spawned ${agentId} (urgent)`);
}

export async function processScheduledAgents() {
  const today = new Date().toISOString().split('T')[0];
  const scheduledPath = path.join(EVENTS_ROOT, 'scheduled', today);
  
  try {
    const files = await fs.readdir(scheduledPath);
    const pending = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const content = await fs.readFile(path.join(scheduledPath, file), 'utf8');
      const schedule = JSON.parse(content);
      
      if (schedule.status === 'pending') {
        pending.push(schedule);
      }
    }
    
    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    pending.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    // Process top 5
    for (const schedule of pending.slice(0, 5)) {
      await runAgentNow(schedule.agent, schedule.input);
      
      // Mark as running
      schedule.status = 'running';
      schedule.startedAt = new Date().toISOString();
      await fs.writeFile(
        path.join(scheduledPath, `${schedule.id}.json`),
        JSON.stringify(schedule, null, 2)
      );
    }
    
    return pending.length;
  } catch {
    return 0;
  }
}

export async function getRecentEvents(hours = 24) {
  const events = [];
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const eventPath = path.join(EVENTS_ROOT, today);
    const files = await fs.readdir(eventPath);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const content = await fs.readFile(path.join(eventPath, file), 'utf8');
      const event = JSON.parse(content);
      
      if (new Date(event.timestamp).getTime() > cutoff) {
        events.push(event);
      }
    }
    
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch {
    return [];
  }
}

// CLI
const command = process.argv[2];
if (command === 'process') {
  const count = await processScheduledAgents();
  console.log(`Processed ${count} scheduled agents`);
} else if (command === 'emit' && process.argv[3]) {
  const event = await emitEvent(process.argv[3], JSON.parse(process.argv[4] || '{}'));
  console.log(JSON.stringify(event, null, 2));
}
