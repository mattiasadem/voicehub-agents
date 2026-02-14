#!/usr/bin/env node
// Workflow Engine — executes agent workflow steps

import fs from 'node:fs/promises';
import path from 'node:path';

// Step executors
const STEP_EXECUTORS = {
  'load_skill': async (step, context) => {
    const { loadSkill } = await import('./skill-loader.mjs');
    const skill = await loadSkill(step.skill);
    
    if (!skill.loaded) {
      throw new Error(`Failed to load skill: ${step.skill}`);
    }
    
    context.skills[step.skill] = skill;
    console.log(`[Workflow] Loaded skill: ${step.skill}`);
    return { skill: step.skill, status: 'loaded' };
  },
  
  'search': async (step, context) => {
    const { web_search, web_fetch } = await import('../../voicehub.x-and/scripts/blog/publish-post.mjs').catch(() => ({}));
    
    const results = [];
    for (const source of step.sources) {
      console.log(`[Workflow] Searching: ${source}`);
      
      if (source === 'reddit') {
        // Direct Reddit scraping
        const url = `https://www.reddit.com/r/smallbusiness/search.json?q=${encodeURIComponent(step.queries)}&limit=25`;
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScoutBot/1.0)' }
          });
          const data = await response.json();
          results.push(...extractRedditPosts(data));
        } catch (e) {
          console.warn(`Reddit search failed: ${e.message}`);
        }
      }
    }
    
    context.searchResults = results;
    return { count: results.length, sources: step.sources };
  },
  
  'fetch': async (step, context) => {
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(step.url, {
      headers: step.headers || {},
    });
    
    const content = step.format === 'json' ? await response.json() : await response.text();
    
    context.fetchedData = content;
    return { url: step.url, size: JSON.stringify(content).length };
  },
  
  'score': async (step, context) => {
    // Scoring logic for prospects
    const items = context.searchResults || [];
    const scored = items.map(item => {
      const score = calculateScore(item, step.method);
      return { ...item, score, level: scoreToLevel(score, step.output) };
    });
    
    context.scoredResults = scored;
    
    const counts = {};
    for (const level of step.output) {
      counts[level] = scored.filter(s => s.level === level).length;
    }
    
    return { total: scored.length, counts };
  },
  
  'enrich': async (step, context) => {
    const items = context.scoredResults || [];
    const enriched = await Promise.all(
      items
        .filter(i => ['hot', 'warm'].includes(i.level))
        .map(async item => {
          const enriched = { ...item };
          for (const field of step.find || []) {
            enriched[field] = await enrichField(item, field, step.persona);
          }
          return enriched;
        })
    );
    
    context.enrichedResults = enriched;
    return { enriched: enriched.length };
  },
  
  'save': async (step, context) => {
    const today = new Date().toISOString().split('T')[0];
    const savePath = step.path.replace('%Y%m%d', today.replace(/-/g, ''));
    const fullPath = path.resolve(savePath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const data = {
      date: today,
      agent: context.agentId,
      results: context.enrichedResults || context.scoredResults || context.searchResults || [],
      metadata: {
        executedAt: new Date().toISOString(),
        steps: context.stepsExecuted,
      },
    };
    
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
    
    context.savedPath = fullPath;
    return { path: fullPath, records: data.results.length };
  },
  
  'report': async (step, context) => {
    const results = context.enrichedResults || context.scoredResults || [];
    const summary = {};
    
    for (const key of step.summary || []) {
      if (key.includes('_count')) {
        const level = key.replace('_count', '');
        summary[key] = results.filter(r => r.level === level).length;
      } else if (key === 'sample_emails') {
        summary[key] = results.slice(0, 3).map(r => r.email_draft);
      }
    }
    
    context.report = summary;
    console.log('[Workflow] Report:', JSON.stringify(summary, null, 2));
    return summary;
  },
  
  'llm_generate': async (step, context) => {
    const { prompt, model = 'kimi', maxTokens = 4000 } = step;
    
    // This would call the actual LLM
    // For now return a placeholder response
    console.log(`[Workflow] LLM generate (${model}): ${prompt.slice(0, 50)}...`);
    
    context.llmOutput = { generated: true, model, timestamp: new Date().toISOString() };
    return context.llmOutput;
  },
};

export async function executeWorkflow(workflow, context = {}) {
  context.skills = context.skills || {};
  context.stepsExecuted = [];
  
  const results = [];
  
  for (let i = 0; i < workflow.length; i++) {
    const step = workflow[i];
    const stepNum = i + 1;
    
    console.log(`\n[Workflow] Step ${stepNum}/${workflow.length}: ${step.action}`);
    
    const executor = STEP_EXECUTORS[step.action];
    if (!executor) {
      console.warn(`Unknown action: ${step.action}`);
      continue;
    }
    
    try {
      const startTime = Date.now();
      const result = await executor(step, context);
      const duration = Date.now() - startTime;
      
      context.stepsExecuted.push({
        step: stepNum,
        action: step.action,
        status: 'success',
        duration,
        result,
      });
      
      results.push(result);
      
    } catch (e) {
      console.error(`[Workflow] Step ${stepNum} failed: ${e.message}`);
      
      context.stepsExecuted.push({
        step: stepNum,
        action: step.action,
        status: 'failed',
        error: e.message,
      });
      
      // Stop workflow on failure unless step.allowFailure
      if (!step.allowFailure) {
        throw e;
      }
    }
  }
  
  return {
    success: true,
    steps: workflow.length,
    executed: context.stepsExecuted,
    results,
    context: {
      skills: Object.keys(context.skills),
      records: context.savedPath,
    },
  };
}

// Helper functions
function extractRedditPosts(data) {
  if (!data.data?.children) return [];
  return data.data.children.map(child => ({
    title: child.data.title,
    selftext: child.data.selftext,
    url: `https://reddit.com${child.data.permalink}`,
    author: child.data.author,
    score: child.data.score,
  }));
}

function calculateScore(item, method) {
  // Simplified BANT scoring
  let score = 0;
  const text = `${item.title} ${item.selftext || ''}`.toLowerCase();
  
  if (method === 'bant') {
    if (text.includes('hiring')) score += 30;
    if (text.includes('need')) score += 20;
    if (text.includes('budget') || text.includes('$')) score += 35;
    if (text.includes('missed call') || text.includes('losing sales')) score += 25;
  }
  
  return Math.min(score, 100);
}

function scoreToLevel(score, levels) {
  if (score >= 70 && levels.includes('hot')) return 'hot';
  if (score >= 50 && levels.includes('warm')) return 'warm';
  if (levels.includes('cold')) return 'cold';
  return 'cold';
}

async function enrichField(item, field, persona) {
  // Simplified enrichment
  if (field === 'email') {
    return `[enrichment-pending] for ${item.title?.slice(0, 30) || 'unknown'}`;
  }
  return '[pending]';
}
