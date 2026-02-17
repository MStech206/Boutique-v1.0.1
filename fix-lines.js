const fs = require('fs');

console.log('🔧 Fixing line 1216...\n');

let lines = fs.readFileSync('sapthala-admin-clean.html', 'utf8').split('\n');

console.log('Total lines:', lines.length);
console.log('Line 1216 before:', lines[1215]);

// Replace line 1216 (index 1215)
lines[1215] = "            loginBtn.innerHTML = '🔄 Logging in...';";

console.log('Line 1216 after:', lines[1215]);

// Find and fix other lines
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('showLoginSuccess') && lines[i].includes('Login successful')) {
        console.log(`\nLine ${i+1} before:`, lines[i]);
        lines[i] = lines[i].replace(/showLoginSuccess\([^)]+\)/, "showLoginSuccess('✅ Login successful! Redirecting...')");
        console.log(`Line ${i+1} after:`, lines[i]);
    }
    if (lines[i].includes('Please') && lines[i].includes('enter both')) {
        console.log(`\nLine ${i+1} before:`, lines[i]);
        lines[i] = lines[i].replace(/showLoginError\([^)]+\)/, "showLoginError('Please enter both username and password')");
        console.log(`Line ${i+1} after:`, lines[i]);
    }
}

// Write back
fs.writeFileSync('sapthala-admin-clean.html', lines.join('\n'), 'utf8');

console.log('\n✅ File fixed!');
console.log('🔄 Clear cache (Ctrl+Shift+Delete) and refresh (Ctrl+F5)');
