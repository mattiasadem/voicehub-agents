# VoiceHub Orchestrator

Unified agent execution system for VoiceHub AI Workforce.

## Quick Start

```bash
# Run any agent
node orchestrator/run-agent.mjs scout-alpha

# With options
node orchestrator/run-agent.mjs reach-3 --input '{"prospects": [...]}' --force

# Dry run (preview only)
node orchestrator/run-agent.mjs scout-alpha --dry-run
```

## Architecture

### Components

| File | Purpose |
|------|---------|
| `run-agent.mjs` | Main entry point — runs any agent |
| `agent-loader.mjs` | Loads agent configs from JSON |
| `skill-loader.mjs` | Loads skills with caching |
| `workflow-engine.mjs` | Executes workflow steps |
| `event-bus.mjs` | Agent-to-agent triggers |

### Data Flow

```
User → run-agent.mjs → agent-loader → skill-loader
                          ↓
                   workflow-engine
                          ↓
           event-bus → triggers next agent
```

## Agent Configuration

Each agent is defined in `agents/{name}/agent.json`:

```json
{
  "id": "scout-alpha",
  "name": "Lead Scout",
  "model": "kimi",
  "enabled": true,
  "skills": ["social-content", "email-sequence"],
  "workflow": [
    { "step": 1, "action": "load_skill", "skill": "social-content" },
    { "step": 2, "action": "search", "sources": ["reddit"], "queries": "..." },
    { "step": 3, "action": "score", "method": "bant" },
    { "step": 4, "action": "save", "path": "memory/..." }
  ]
}
```

## Event Triggers

Automatic handoffs between agents:

| Event | Condition | Target Agent | Priority |
|-------|-----------|--------------|----------|
| `scout.completed` | hotCount >= 2 | reach-3 | high |
| `blog.published` | always | ghost-9 | normal |
| `prospect.hot` | always | reach-3 | urgent |
| `competitor.changed` | changeType == 'pricing' | intel-9 | urgent |

## Workflow Steps

Available actions:

- `load_skill` — Load a skill into context
- `search` — Search Reddit/Twitter
- `fetch` — HTTP fetch with caching
- `score` — Score items (BANT, custom)
- `enrich` — Enrich with contact data
- `save` — Save results to JSON
- `report` — Generate summary report
- `llm_generate` — Call LLM (Kimi)

## Examples

### Run Scout (find prospects)
```bash
node orchestrator/run-agent.mjs scout-alpha
# Output: memory/scout-alpha/2026-02-14/prospects.json
```

### Run Reach-3 (draft emails)
```bash
# After scout finds prospects
node orchestrator/run-agent.mjs reach-3 --input '{
  "prospects": [...]
}'
```

### Force run disabled agent
```bash
node orchestrator/run-agent.mjs ghost-9 --force
```

## Directory Structure

```
orchestrator/
├── run-agent.mjs          # Main runner (use this)
├── agent-loader.mjs       # Config loader
├── skill-loader.mjs       # Skill management
├── workflow-engine.mjs    # Step executor
├── event-bus.mjs          # Inter-agent events
├── dispatch.mjs           # Deprecated
└── README.md              # This file
```

## Migration from Old System

**Old way (messy cron payloads):**
```json
{
  "task": "Long messy shell command with pipes..."
}
```

**New way (clean workflow):**
```json
{
  "workflow": [
    { "action": "load_skill", "skill": "..." },
    { "action": "search", "sources": [...] },
    { "action": "save" }
  ]
}
```

## Debugging

```bash
# Dry run (don't execute)
node orchestrator/run-agent.mjs scout-alpha --dry-run

# No events (don't trigger reach-3)
node orchestrator/run-agent.mjs scout-alpha --no-emit

# Check agent status
node orchestrator/agent-loader.mjs list
```

## Analytics

Results saved to:
- `memory/analytics/{date}/{agent}-{timestamp}.json`
- `memory/events/{date}/` — Event log
- `memory/failures/{date}/` — Error log
