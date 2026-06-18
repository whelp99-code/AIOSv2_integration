#!/usr/bin/env node
/**
 * Validate workspace package names before pnpm can replace nested source
 * directories with dependency symlinks.
 */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEARCH_ROOTS = ['apps', 'packages', 'plugins', 'tools'];

function collectManifests(directory, manifests = []) {
  if (!existsSync(directory) || lstatSync(directory).isSymbolicLink()) return manifests;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.ignored')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectManifests(path, manifests);
    if (entry.isFile() && entry.name === 'package.json') manifests.push(path);
  }
  return manifests;
}

function isValidPackageName(name) {
  return /^@[a-z0-9._-]+\/[a-z0-9._-]+$/.test(name) || /^[a-z0-9._-]+$/.test(name);
}

const errors = [];
for (const searchRoot of SEARCH_ROOTS) {
  for (const manifest of collectManifests(join(ROOT, searchRoot))) {
    const packageJson = JSON.parse(readFileSync(manifest, 'utf8'));
    if (packageJson.name && !isValidPackageName(packageJson.name)) {
      errors.push(`${manifest}: invalid package name ${packageJson.name}`);
    }
  }
}

for (const path of [
  'packages/application/workflow',
  'packages/domain/workflow',
  'packages/infrastructure/llm',
  'packages/infrastructure/workflow',
]) {
  const absolutePath = join(ROOT, path);
  if (!existsSync(absolutePath)) errors.push(`${path}: missing source directory`);
  else if (lstatSync(absolutePath).isSymbolicLink()) errors.push(`${path}: must not be a symlink`);
  else if (!existsSync(join(absolutePath, 'package.json'))) errors.push(`${path}: missing package.json`);
}

if (errors.length > 0) {
  console.error('[workspace-guard] invalid workspace layout');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[workspace-guard] workspace layout is valid');
