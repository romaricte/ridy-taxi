#!/usr/bin/env node
 
import { Project, SyntaxKind, EnumDeclaration, StringLiteral } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * CLI args:
 *   --out <dir>          Output directory (default: ./rust_enums)
 *   --drop-prefix <txt>  If provided, removes this leading prefix from enum names when generating Rust names
 *                        Example: ParkSpotVehicleType -> VehicleType  (drop-prefix=ParkSpot)
 */
const args = process.argv.slice(2);
function readArg(flag: string, def?: string) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const OUT_DIR = readArg('--out', 'rust_enums');
const DROP_PREFIX = readArg('--drop-prefix', ''); // e.g. "ParkSpot"

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function pascalToSnake(name: string): string {
  // VehicleType -> vehicle_type
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function dropPrefix(name: string, prefix: string): string {
  if (!prefix) return name;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

function rustFileHeader(): string {
  return [
    '// AUTO-GENERATED from TS enums by ts-enums-to-rust (ts-morph). Do not edit.',
    'use std::fmt;',
    'use std::str::FromStr;',
    '',
  ].join('\n');
}

function genRustEnumBlock(
  rustName: string,
  variants: { ident: string; value: string }[],
): string {
  const enumDerive = '#[derive(Debug, Clone, PartialEq, Eq)]';
  const enumDecl =
    `pub enum ${rustName} {\n` +
    variants.map((v) => `    ${v.ident},`).join('\n') +
    `\n}\n`;

  const displayImpl =
    `impl fmt::Display for ${rustName} {\n` +
    `    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {\n` +
    `        let s = match self {\n` +
    variants
      .map((v) => `            ${rustName}::${v.ident} => "${v.value}",`)
      .join('\n') +
    `\n        };\n` +
    `        write!(f, "{}", s)\n` +
    `    }\n` +
    `}\n`;

  const fromStrImpl =
    `impl FromStr for ${rustName} {\n` +
    `    type Err = String;\n` +
    `    fn from_str(s: &str) -> Result<Self, Self::Err> {\n` +
    `        match s {\n` +
    variants
      .map((v) => `            "${v.value}" => Ok(${rustName}::${v.ident}),`)
      .join('\n') +
    `            other => Err(format!("Invalid ${rustName}: {}", other)),\n` +
    `        }\n` +
    `    }\n` +
    `}\n`;

  return [enumDerive, enumDecl, displayImpl, fromStrImpl].join('\n');
}

function isExportedEnum(e: EnumDeclaration) {
  return e.hasModifier(SyntaxKind.ExportKeyword);
}

function allMembersAreStringLiterals(e: EnumDeclaration) {
  return e.getMembers().every((m) => {
    const init = m.getInitializer();
    return !!init && init.getKind() === SyntaxKind.StringLiteral;
  });
}

function tsIdentToRustVariant(tsIdent: string): string {
  // Keep as-is (assumes TS enum keys are PascalCase/UpperCamelCase).
  // If you need to sanitize further, add rules here.
  return tsIdent.replace(/[^A-Za-z0-9_]/g, '_');
}

async function main() {
  ensureDir(OUT_DIR);

  const project = new Project({
    // If you have a tsconfig.json, you can use tsConfigFilePath to improve type resolution:
    // tsConfigFilePath: "tsconfig.json",
    skipAddingFilesFromTsConfig: true,
  });

  // Add all .ts/.tsx files (except node_modules, dist, build)
  project.addSourceFilesAtPaths([
    '**/*.ts',
    '**/*.tsx',
    '!node_modules/**',
    '!dist/**',
    '!build/**',
    '!coverage/**',
    '!**/*.d.ts',
  ]);

  const sourceFiles = project.getSourceFiles();
  let converted = 0,
    skippedNonString = 0,
    skippedNotExported = 0;

  for (const sf of sourceFiles) {
    const enums = sf.getEnums();
    for (const e of enums) {
      if (!isExportedEnum(e)) {
        skippedNotExported++;
        continue;
      }
      if (!allMembersAreStringLiterals(e)) {
        skippedNonString++;
        continue;
      }

      const tsName = e.getName();
      const rustName = dropPrefix(tsName, DROP_PREFIX) || tsName;

      // collect (ident, value)
      const variants = e.getMembers().map((m) => {
        const ident = tsIdentToRustVariant(m.getName());
        const init = m.getInitializer() as StringLiteral;
        const val = init.getLiteralText(); // gets 'car' from 'car'
        return { ident, value: val };
      });

      const code =
        rustFileHeader() + '\n' + genRustEnumBlock(rustName, variants) + '\n';
      const fileName = `${pascalToSnake(rustName)}.rs`;
      const outPath = path.join(OUT_DIR, fileName);
      fs.writeFileSync(outPath, code, 'utf8');
      converted++;
      console.log(`✔ Generated ${outPath} from ${tsName}`);
    }
  }

  console.log(
    `\nDone. Enums converted: ${converted}. Skipped (non-string members): ${skippedNonString}. Skipped (not exported): ${skippedNotExported}. Output: ${OUT_DIR}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
