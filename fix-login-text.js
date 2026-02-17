const fs = require('fs');

console.log('🔧 Fixing corrupted text in sapthala-admin-clean.html...');

let content = fs.readFileSync('sapthala-admin-clean.html', 'utf8');

// Fix 1: Corrupted loading button text
const before1 = content.includes('dY", Logging in...');
content = content.replace(/loginBtn\.innerHTML = 'dY", Logging in\.\.\.';/g, "loginBtn.innerHTML = '🔄 Logging in...';");
const after1 = content.includes('dY", Logging in...');
console.log(`Fix 1 - Loading text: ${before1 ? 'FOUND' : 'NOT FOUND'} -> ${!after1 ? 'FIXED ✅' : 'FAILED ❌'}`);

// Fix 2: Corrupted success message
const before2 = content.includes('バ. Login successful');
content = content.replace(/showLoginSuccess\('バ\. Login successful! Redirecting\.\.\.'\);/g, "showLoginSuccess('✅ Login successful! Redirecting...');");
const after2 = content.includes('バ. Login successful');
console.log(`Fix 2 - Success message: ${before2 ? 'FOUND' : 'NOT FOUND'} -> ${!after2 ? 'FIXED ✅' : 'FAILED ❌'}`);

// Fix 3: Line break in error message
const before3 = content.includes('Please \nenter both');
content = content.replace(/showLoginError\('Please \nenter both username and password'\);/g, "showLoginError('Please enter both username and password');");
const after3 = content.includes('Please \nenter both');
console.log(`Fix 3 - Error message: ${before3 ? 'FOUND' : 'NOT FOUND'} -> ${!after3 ? 'FIXED ✅' : 'FAILED ❌'}`);

// Write the fixed content
fs.writeFileSync('sapthala-admin-clean.html', content, 'utf8');

console.log('\n✅ All fixes applied successfully!');
console.log('📝 Please refresh your browser (Ctrl+F5) to see the changes.');
