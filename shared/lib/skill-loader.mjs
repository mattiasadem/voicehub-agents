#!/usr/bin/env node
// Skill Loader — loads skill instructions for agents
// Usage: import { loadSkill } from '../shared/lib/skill-loader.mjs'

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = path.join(__dirname, '..', '..', '..', 'skills');

export async function loadSkill(skillName) {
  const skillPath = path.join(SKILLS_ROOT, skillName, 'SKILL.md');
  try {
    const content = await fs.readFile(skillPath, 'utf8');
    return {
      name: skillName,
      content,
      path: skillPath,
      loaded: true
    };
  } catch (e) {
    return {
      name: skillName,
      content: null,
      path: skillPath,
      loaded: false,
      error: e.message
    };
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
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return [];
  }
}

// CLI mode
const skillName = process.argv[2];
if (skillName) {
  const skill = await loadSkill(skillName);
  if (skill.loaded) {
    console.log(`=== ${skill.name.toUpperCase()} SKILL ===`);
    console.log(skill.content.slice(0, 2000));
    console.log('\n...[truncated]');
  } else {
    console.error(`Skill not found: ${skillName}`);
    console.log('Available skills:', await listAvailableSkills());
    process.exit(1);
  }
}
