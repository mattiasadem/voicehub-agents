# VoiceHub AI Agents

AI workforce for VoiceHub — runs on OpenClaw native (cron + sessions_spawn).

## Structure

```
agents/           # Individual AI workers
shared/           # Common utilities, prompts, config
orchestrator/     # Jarvis dispatch layer
memory/           # Agent state, logs, results
```

## How It Works

**Option A — OpenClaw Native:**
- Each agent = cron job scheduled via `openclaw cron`
- Tasks dispatched via `sessions_spawn` to sub-agents
- Reliable, auto-restart, built-in

## Quick Start

```bash
# Add a new agent
cd agents/
mkdir scout-alpha

# Create agent definition
# See agents/blog-bot/ for template

# Schedule with Jarvis
"Jarvis, schedule scout-alpha to run hourly"
```

## Active Agents

| Agent | Schedule | Status |
|-------|----------|--------|
| blog-bot | Daily 08:00 | ✅ Active |
| scout-alpha | TBD | 🔄 Building |

## Adding New Agent

1. Create directory in `agents/<name>/`
2. Add `agent.json` (config) and `run.mjs` (task)
3. Tell Jarvis to schedule it
4. Done — Jarvis creates cronjob
