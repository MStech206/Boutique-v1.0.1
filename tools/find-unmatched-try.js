const fs = require('fs');
const path = require('path');

function walk(dir, exts, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, exts, fileList);
    } else if (exts.includes(path.extname(full))) {
      fileList.push(full);
    }
  }
  return fileList;
}

const exts = ['.html', '.js', '.ts'];
const files = walk(process.cwd(), exts).filter(p => !p.includes('node_modules') && !p.includes('.git') && !p.includes('flutter_pub_cache'));
let found = false;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const tryCount = (src.match(/\btry\s*\{/g) || []).length;
  const catchCount = (src.match(/\bcatch\s*\(/g) || []).length;
  const finallyCount = (src.match(/\bfinally\b/g) || []).length;
  if (tryCount > (catchCount + finallyCount)) {
    console.log(`${f}: try=${tryCount} catch=${catchCount} finally=${finallyCount}`);
    found = true;
  }
}
if (!found) console.log('No unmatched try blocks found (by count heuristic).');
