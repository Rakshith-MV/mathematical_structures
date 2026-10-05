import fs from 'fs';
import path from 'path';
import { validateDomainData } from '../src/lib/validator';
import { DomainData, Context, Property, Statement, Counterexample } from '../src/types';

export function loadDomainData(domainDir: string): DomainData {
  const domainName = path.basename(domainDir);
  const contextsPath = path.join(domainDir, 'contexts.json');
  const propertiesPath = path.join(domainDir, 'properties.json');
  const statementsPath = path.join(domainDir, 'statements.json');
  const counterexamplesPath = path.join(domainDir, 'counterexamples.json');

  if (!fs.existsSync(contextsPath)) {
    throw new Error(`Missing contexts.json in ${domainDir}`);
  }
  if (!fs.existsSync(propertiesPath)) {
    throw new Error(`Missing properties.json in ${domainDir}`);
  }
  if (!fs.existsSync(statementsPath)) {
    throw new Error(`Missing statements.json in ${domainDir}`);
  }
  if (!fs.existsSync(counterexamplesPath)) {
    throw new Error(`Missing counterexamples.json in ${domainDir}`);
  }

  const contexts: Context[] = JSON.parse(fs.readFileSync(contextsPath, 'utf-8'));
  const properties: Property[] = JSON.parse(fs.readFileSync(propertiesPath, 'utf-8'));
  const statements: Statement[] = JSON.parse(fs.readFileSync(statementsPath, 'utf-8'));
  const counterexamples: Counterexample[] = JSON.parse(fs.readFileSync(counterexamplesPath, 'utf-8'));

  return {
    domain: domainName,
    contexts,
    properties,
    statements,
    counterexamples,
  };
}

export function runAllValidations(dataDir: string): { success: boolean; totalErrors: number; totalWarnings: number; totalUnverified: number } {
  if (!fs.existsSync(dataDir)) {
    console.error(`Error: data directory not found at ${dataDir}`);
    return { success: false, totalErrors: 1, totalWarnings: 0, totalUnverified: 0 };
  }

  const entries = fs.readdirSync(dataDir, { withFileTypes: true });
  const domainDirs = entries
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(dataDir, dirent.name));

  if (domainDirs.length === 0) {
    console.warn(`Warning: No domains found in ${dataDir}`);
    return { success: true, totalErrors: 0, totalWarnings: 0, totalUnverified: 0 };
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalUnverified = 0;

  console.log(`\n🔍 Validating ${domainDirs.length} mathematical domain(s)...`);

  for (const domainDir of domainDirs) {
    const domainName = path.basename(domainDir);
    console.log(`\n--- Domain: [${domainName}] ---`);

    try {
      const domainData = loadDomainData(domainDir);
      const result = validateDomainData(domainData);

      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      totalUnverified += result.unverifiedCount;

      console.log(`  Properties:      ${domainData.properties.length}`);
      console.log(`  Statements:      ${domainData.statements.length}`);
      console.log(`  Counterexamples: ${domainData.counterexamples.length}`);
      console.log(`  Contexts:        ${domainData.contexts.length}`);

      if (result.errors.length > 0) {
        console.error(`  ❌ Errors (${result.errors.length}):`);
        for (const err of result.errors) {
          console.error(`     - [${err.entityId || 'general'}]: ${err.message}`);
        }
      }

      if (result.warnings.length > 0) {
        console.warn(`  ⚠️ Warnings (${result.warnings.length}):`);
        for (const warn of result.warnings) {
          console.warn(`     - [${warn.entityId || 'general'}]: ${warn.message}`);
        }
      }

      if (result.unverifiedCount > 0) {
        console.warn(`  ⚠️ Notice: ${result.unverifiedCount} unverified statement(s)/counterexample(s) (verified: false)`);
      }

      if (result.errors.length === 0) {
        console.log(`  ✅ Domain [${domainName}] is valid!`);
      }
    } catch (err: any) {
      totalErrors++;
      console.error(`  ❌ Failed to parse domain [${domainName}]:`, err.message);
    }
  }

  console.log('\n================ Summary ================');
  console.log(`Domains validated: ${domainDirs.length}`);
  console.log(`Total Errors:      ${totalErrors}`);
  console.log(`Total Warnings:    ${totalWarnings}`);
  console.log(`Total Unverified:  ${totalUnverified}`);
  console.log('=========================================\n');

  return {
    success: totalErrors === 0,
    totalErrors,
    totalWarnings,
    totalUnverified
  };
}

// If run directly from CLI
if (process.argv[1] && (process.argv[1].endsWith('validate.ts') || process.argv[1].endsWith('validate.js'))) {
  const dataDir = path.resolve(process.cwd(), 'data');
  const { success } = runAllValidations(dataDir);
  if (!success) {
    process.exit(1);
  }
}
