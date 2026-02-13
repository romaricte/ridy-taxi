import * as fs from 'fs';
import * as path from 'path';

const currentScriptFileName = path.basename(__filename);
const outputFileName = 'index.ts';
const currentDir = __dirname;

/**
 * Recursively finds all TypeScript files in a directory, excluding specific files.
 * @param dir The directory to search.
 * @param rootDir The root directory from which relative paths for modules are calculated.
 * @returns An array of module paths (relative to rootDir, without .ts extension).
 */
function findTypeScriptFilesRecursive(dir: string, rootDir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findTypeScriptFilesRecursive(fullPath, rootDir));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      // Exclude the script itself and the output file
      if (
        entry.name !== currentScriptFileName &&
        entry.name !== outputFileName
      ) {
        const relativePath = path.relative(rootDir, fullPath);
        // Convert to module path (e.g., 'user.entity' or 'nested/item.entity')
        // Ensure forward slashes for cross-platform compatibility in import paths
        const modulePath = relativePath.replace(/\\/g, '/').slice(0, -3);
        files.push(modulePath);
      }
    }
  }
  return files;
}

/**
 * Generates an index.ts file that exports all found TypeScript modules.
 */
function generateIndexFile() {
  console.log(`Generating ${outputFileName} in ${currentDir}...`);

  const tsModules = findTypeScriptFilesRecursive(currentDir, currentDir);

  if (tsModules.length === 0) {
    const emptyIndexContent =
      '// No TypeScript modules found to export (excluding this script and index.ts itself).\n';
    try {
      fs.writeFileSync(
        path.join(currentDir, outputFileName),
        emptyIndexContent,
        'utf8',
      );
      console.log(
        `Generated an empty ${outputFileName} as no modules were found.`,
      );
    } catch (error) {
      console.error(`Error writing empty ${outputFileName}:`, error);
    }
    return;
  }

  // Sort for consistent order, making version control diffs cleaner
  tsModules.sort();

  const exportStatements = tsModules.map(
    (modulePath) => `export * from './${modulePath}';`,
  );
  const content = exportStatements.join('\n') + '\n'; // Add a trailing newline

  try {
    fs.writeFileSync(path.join(currentDir, outputFileName), content, 'utf8');
    console.log(
      `Successfully generated ${outputFileName} with ${tsModules.length} export(s).`,
    );
  } catch (error) {
    console.error(`Error writing ${outputFileName}:`, error);
  }
}

// Execute the generation function
generateIndexFile();
