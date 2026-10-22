#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const appJsPath = path.join(targetDir, 'app.js');
const swJsPath = path.join(targetDir, 'sw.js');
const indexPath = path.join(targetDir, 'index.html');
const stylePath = path.join(targetDir, 'style.css');

const errors = [];
const info = [];

// 1. Check required project files exist
const requiredFiles = [appJsPath, swJsPath, indexPath, stylePath];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    errors.push(`Missing required file: ${path.basename(file)}`);
  }
}

if (errors.length > 0) {
  console.error(`FAIL: Missing essential project files:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

// 2. Syntax validation
try {
  execSync(`node -c "${appJsPath}"`, { stdio: 'pipe' });
  info.push('app.js syntax: OK');
} catch (e) {
  errors.push(`Syntax error in app.js: ${e.message}`);
}

try {
  execSync(`node -c "${swJsPath}"`, { stdio: 'pipe' });
  info.push('sw.js syntax: OK');
} catch (e) {
  errors.push(`Syntax error in sw.js: ${e.message}`);
}

// 3. Inspect sw.js cache name and core assets
try {
  const swContent = fs.readFileSync(swJsPath, 'utf8');
  const cacheMatch = swContent.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  if (cacheMatch) {
    info.push(`Service Worker Cache: ${cacheMatch[1]}`);
  } else {
    errors.push('Could not find CACHE_NAME in sw.js');
  }

  const assetsMatch = swContent.match(/CORE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  if (assetsMatch) {
    const assetEntries = assetsMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    const missingAssets = [];
    for (const asset of assetEntries) {
      const resolved = path.join(targetDir, asset);
      if (!fs.existsSync(resolved)) {
        missingAssets.push(asset);
      }
    }
    if (missingAssets.length > 0) {
      errors.push(`CORE_ASSETS missing on disk: ${missingAssets.join(', ')}`);
    } else {
      info.push(`CORE_ASSETS (${assetEntries.length} items): All exist`);
    }
  }
} catch (e) {
  errors.push(`Failed inspecting sw.js: ${e.message}`);
}

// 4. Verify SVG icon references in app.js
try {
  const appContent = fs.readFileSync(appJsPath, 'utf8');
  const getSvgIconMatch = appContent.match(/function getSvgIcon\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  if (getSvgIconMatch) {
    const fnBody = getSvgIconMatch[1];
    const definedCases = new Set();
    const caseRegex = /case\s+['"]([^'"]+)['"]:/g;
    let match;
    while ((match = caseRegex.exec(fnBody)) !== null) {
      definedCases.add(match[1]);
    }

    const iconCallRegex = /getSvgIcon\(\s*['"]([^'"]+)['"]/g;
    const missingIcons = new Set();
    while ((match = iconCallRegex.exec(appContent)) !== null) {
      const iconName = match[1];
      if (!definedCases.has(iconName)) {
        missingIcons.add(iconName);
      }
    }

    if (missingIcons.size > 0) {
      errors.push(`Undefined SVG icon(s) referenced: ${Array.from(missingIcons).join(', ')}`);
    } else {
      info.push(`SVG icons (${definedCases.size} icons defined): All calls valid`);
    }
  }
} catch (e) {
  errors.push(`Failed checking SVG icons: ${e.message}`);
}

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} issue(s) detected:`);
  errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
} else {
  console.log(`SUCCESS: Project verified cleanly.`);
  info.forEach((item) => console.log(`✓ ${item}`));
  process.exit(0);
}
