const fs = require('fs');

let content = fs.readFileSync('sapthala-admin-clean.html', 'utf8');

// Fix corrupted loading text
content = content.replace(/loginBtn\.innerHTML = 'dY", Logging in\.\.\.';/g, "loginBtn.innerHTML = 'Logging in...';");

// Fix corrupted success message
content = content.replace(/showLoginSuccess\('バ\. Login successful! Redirecting\.\.\.'\);/g, "showLoginSuccess('Login successful! Redirecting...');");

fs.writeFileSync('sapthala-admin-clean.html', content, 'utf8');

console.log('✅ Fixed corrupted text in login function');
