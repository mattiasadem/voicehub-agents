#!/usr/bin/env node
// Enhanced Skill Loader — loads skill instructions for agents

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = path.join(__dirname, '..', 'skills');

const skillCache = new Map();

export async function loadSkill(skillName) {
  // Return from cache if available
  if (skillCache.has(skillName)) {
    return skillCache.get(skillName);
  }
  
  const skillPath = path.join(SKILLS_ROOT, skillName, 'SKILL.md');
  
  try {
    const content = await fs.readFile(skillPath, 'utf8');
    const parsed = parseSkillContent(content);
    
    const skill = {
      name: skillName,
      content,
      path: skillPath,
      parsed,
      loaded: true,
      loadedAt: new Date().toISOString(),
    };
    
    // Cache for reuse
    skillCache.set(skillName, skill);
    
    return skill;
  } catch (e) {
    const error = {
      name: skillName,
      content: null,
      path: skillPath,
      loaded: false,
      error: e.message,
    };
    skillCache.set(skillName, error);
    return error;
  }
}

export async function loadSkillReference(skillName, refFile) {
  const refPath = path.join(SKILLS_ROOT, skillName, 'references', refFile);
  try {
    const content = await fs.readFile(refPath, 'utf8');
    return { content, path: refPath, loaded: true };
  } catch (e) {
    return { content: null, path: refPath, loaded: false, error: e.message };
  }
}

export async function listAvailableSkills() {
  try {
    const entries = await fs.readdir(SKILLS_ROOT, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function preloadSkills(skillNames) {
  const results = await Promise.all(
    skillNames.map(name => loadSkill(name))
  );
  
  const failed = results.filter(r => !r.loaded);
  if (failed.length > 0) {
    console.warn(`Failed to load skills: ${failed.map(f => f.name).join(', ')}`);
  }
  
  return results.filter(r => r.loaded);
}

function parseSkillContent(content) {
  // Extract front matter if present
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  
  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[1];
    const body = content.slice(frontMatterMatch[0].length);
    
    // Simple YAML-like parsing
    const meta = {};
    for (const line of frontMatter.split('\n')) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    }
    
    return { meta, body, hasFrontMatter: true };
  }
  
  return { meta: {}, body: content, hasFrontMatter: false };
}

// Inject skill context into agent prompt
export function injectSkillContext(prompt, skills) {
  const context = skills
    .filter(s => s.loaded)
    .map(s => `## ${s.name.toUpperCase()} SKILL\n\n${s.content.slice(0, 2000)}...`)
    .join('\n\n---\n\n');
  
  return `${context}\n\n---\n\n${prompt}`;
}

// CLI
const command = process.argv[2];
if (command === 'list') {
  const skills = await listAvailableSkills();
  console.log('Available skills:');
  skills.forEach(s => console.log(`  - ${s}`));
} else if (command === 'load' && process.argv[3]) {
  const skill = await loadSkill(process.argv[3]);
  console.log(JSON.stringify(skill, null, 2));
}
