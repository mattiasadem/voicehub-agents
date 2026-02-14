#!/usr/bin/env node
// Main Entry Point — Run any agent from command line
// Usage: node orchestrator/run-agent.mjs <agent-id> [options]

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Imports
const { loadAgent, getAgentStatus } = await import('./agent-loader.mjs');
const { preloadSkills, injectSkillContext } = await import('./skill-loader.mjs');
const { executeWorkflow } = await import('./workflow-engine.mjs');
const { emitEvent } = await import('./event-bus.mjs');

// CLI args
const agentId = process.argv[2];
const options = parseOptions(process.argv.slice(3));

if (!agentId) {
  console.log('Usage: node orchestrator/run-agent.mjs <agent-id> [options]');
  console.log('\nOptions:');
  console.log('  --dry-run          Preview without executing');
  console.log('  --force            Run even if disabled');
  console.log('  --input <json>     Pass input data');
  console.log('  --emit-events      Trigger downstream agents');
  console.log('\nExamples:');
  console.log('  node orchestrator/run-agent.mjs scout-alpha');
  console.log('  node orchestrator/run-agent.mjs reach-3 --input \'{\"prospects\": [...]}\'');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(60));
  console.log(`VOICEHUB AI WORKFORCE — Agent Runner`);
  console.log(`Agent: ${agentId}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Load agent
  console.log('\n[1/5] Loading agent configuration...');
  let agent;
  try {
    agent = await loadAgent(agentId);
    console.log(`  ✅ Loaded: ${agent.name}`);
    console.log(`  📋 Skills: ${agent.skills?.join(', ') || 'none'}`);
    console.log(`  ⏰ Schedule: ${agent.schedule || 'manual'}`);
    console.log(`  🔧 Model: ${agent.model || 'default'}`);
  } catch (e) {
    console.error(`  ❌ Failed: ${e.message}`);
    process.exit(1);
  }

  // Check if enabled
  if (!agent.enabled && !options.force) {
    console.error(`\n  ⏸️  Agent is disabled (use --force to run anyway)`);
    process.exit(1);
  }

  // Dry run mode
  if (options.dryRun) {
    console.log('\n[DRY RUN] Would execute:');
    console.log(JSON.stringify(agent.workflow, null, 2));
    process.exit(0);
  }

  // Preload skills
  console.log('\n[2/5] Preloading skills...');
  if (agent.skills?.length > 0) {
    const skills = await preloadSkills(agent.skills);
    console.log(`  ✅ Loaded ${skills.length}/${agent.skills.length} skills`);
    for (const skill of skills) {
      console.log(`     - ${skill.name}`);
    }
  } else {
    console.log('  ℹ️  No skills required');
  }

  // Prepare context
  const context = {
    agentId,
    agent,
    input: options.input ? JSON.parse(options.input) : {},
    startTime: Date.now(),
    skills: {},
  };

  // Execute workflow
  console.log('\n[3/5] Executing workflow...');
  console.log(`  Steps: ${agent.workflow?.length || 0}`);
  console.log('  ' + '-'.repeat(50));

  let result;
  try {
    result = await executeWorkflow(agent.workflow || [], context);
    console.log('  ' + '-'.repeat(50));
    console.log(`  ✅ Workflow completed: ${result.steps} steps`);
  } catch (e) {
    console.log('  ' + '-'.repeat(50));
    console.error(`  ❌ Workflow failed: ${e.message}`);
    await saveFailure(agent, context, e);
    process.exit(1);
  }

  // Emit completion event
  console.log('\n[4/5] Emitting completion event...');
  const eventPayload = {
    agent: agentId,
    success: result.success,
    steps: result.steps,
    duration: Date.now() - context.startTime,
    records: result.context?.records,
    hotCount: result.results?.find(r => r.counts)?.counts?.hot || 0,
    warmCount: result.results?.find(r => r.counts)?.counts?.warm || 0,
    outputPath: result.context?.records,
  };

  if (options.emitEvents !== false) {
    await emitEvent(`${agentId}.completed`, eventPayload);
    console.log('  ✅ Event emitted');
  } else {
    console.log('  ⏸️  Events disabled');
  }

  // Save analytics
  console.log('\n[5/5] Saving analytics...');
  await saveAnalytics(agent, result, context);
  console.log('  ✅ Analytics saved');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Agent:        ${agent.name}`);
  console.log(`Status:       ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Steps:        ${result.steps}`);
  console.log(`Duration:     ${((Date.now() - context.startTime) / 1000).toFixed(2)}s`);
  console.log(`Output:       ${result.context?.records || 'none'}`);
  if (eventPayload.hotCount > 0) {
    console.log(`Hot leads:    ${eventPayload.hotCount} 🔥`);
  }
  console.log('='.repeat(60));
}

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') options.dryRun = true;
    if (args[i] === '--force') options.force = true;
    if (args[i] === '--no-emit') options.emitEvents = false;
    if (args[i] === '--input' && args[i + 1]) {
      options.input = args[i + 1];
      i++;
    }
  }
  return options;
}

async function saveAnalytics(agent, result, context) {
  const today = new Date().toISOString().split('T')[0];
  const analyticsDir = path.join(__dirname, '..', 'memory', 'analytics');
  await fs.mkdir(path.join(analyticsDir, today), { recursive: true });

  const analytics = {
    agent: context.agentId,
    agentName: agent.name,
    timestamp: new Date().toISOString(),
    duration: Date.now() - context.startTime,
    success: result.success,
    steps: result.steps,
    stepResults: result.executed?.map(s => ({
      action: s.action,
      status: s.status,
      duration: s.duration,
    })),
    skillsUsed: Object.keys(context.skills),
    recordsProcessed: result.context?.records || 0,
    outputPath: result.context?.records,
  };

  await fs.writeFile(
    path.join(analyticsDir, today, `${context.agentId}-${Date.now()}.json`),
    JSON.stringify(analytics, null, 2)
  );
}

async function saveFailure(agent, context, error) {
  const today = new Date().toISOString().split('T')[0];
  const failuresDir = path.join(__dirname, '..', 'memory', 'failures');
  await fs.mkdir(path.join(failuresDir, today), { recursive: true });

  const failure = {
    agent: context.agentId,
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    context: {
      stepsExecuted: context.stepsExecuted,
      skills: Object.keys(context.skills),
    },
  };

  await fs.writeFile(
    path.join(failuresDir, today, `${context.agentId}-${Date.now()}.json`),
    JSON.stringify(failure, null, 2)
  );
}

// Run
main().catch(e => {
  console.error(e);
  process.exit(1);
});
