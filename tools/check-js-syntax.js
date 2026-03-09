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

const files = walk(process.cwd(), ['.js']);
let problems = 0;
for (const f of files) {
  // skip tools that are intended to be non-parsed or very large vendor bundles
  if (f.includes('node_modules') || f.includes('flutter_pub_cache') || f.endsWith('.min.js')) continue;
  const src = fs.readFileSync(f, 'utf8');
  try {
    new vm.Script(src, { filename: f });
  } catch (err) {
    problems++;
    console.error(`SYNTAX ERROR in ${f}: ${err.message}`);
  }
}
if (problems === 0) console.log('No syntax errors found in .js files.');
else console.log(`Found ${problems} JS syntax error(s).`);
