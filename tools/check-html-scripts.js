const fs = require('fs');
const path = require('path');
const vm = require('vm');

function walk(dir, exts, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'flutter_pub_cache') continue;
      walk(full, exts, fileList);
    } else if (exts.includes(path.extname(full))) {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk(process.cwd(), ['.html']);
let problems = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // Remove <style> blocks first to avoid matching literal '<script' inside CSS comments
  const cleaned = src.replace(/<style[\s\S]*?<\/style>/gi, '');
  const scripts = [...cleaned.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  if (scripts.length === 0) continue;
  console.log(`\n${f} -> script blocks: ${scripts.length}`);
  for (let i = 0; i < scripts.length; i++) {
    const code = scripts[i][1];
    const preview = code.replace(/\n/g, ' ').substring(0, 260);
    console.log(`  [${i}] preview: ${preview.length > 240 ? preview.substring(0,240)+'...' : preview}`);
    try {
      if (code.trim().length === 0) continue;
      new vm.Script(code, { filename: `${f}#script[${i}]` });
    } catch (err) {
      problems++;
      console.error(`    SYNTAX ERROR in ${f} <script index=${i}>: ${err.message}`);
      console.error(`    preview: ${preview}`);
    }
  }
}
if (problems === 0) console.log('\nNo syntax errors found in HTML <script> blocks.');
else console.log(`\nFound ${problems} problem(s) in HTML scripts.`);
