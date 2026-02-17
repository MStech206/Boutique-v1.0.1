const fs = require('fs');

console.log('🔧 Fixing corrupted characters...\n');

let content = fs.readFileSync('sapthala-admin-clean.html', 'utf8');

// Count occurrences before
const count1Before = (content.match(/dY"/g) || []).length;
const count2Before = (content.match(/バ/g) || []).length;

console.log(`Before: Found ${count1Before} instances of 'dY"' and ${count2Before} instances of 'バ'`);

// Replace using string methods
content = content.split("loginBtn.innerHTML = 'dY\", Logging in...';").join("loginBtn.innerHTML = '🔄 Logging in...';");
content = content.split("showLoginSuccess('バ. Login successful! Redirecting...');").join("showLoginSuccess('✅ Login successful! Redirecting...');");
content = content.split("showLoginError('Please \nenter both username and password');").join("showLoginError('Please enter both username and password');");

// Count occurrences after
const count1After = (content.match(/dY"/g) || []).length;
const count2After = (content.match(/バ/g) || []).length;

console.log(`After: Found ${count1After} instances of 'dY"' and ${count2After} instances of 'バ'`);

// Write back
fs.writeFileSync('sapthala-admin-clean.html', content, 'utf8');

console.log('\n✅ File updated!');
console.log('🔄 Refresh browser with Ctrl+F5');
