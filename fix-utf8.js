const fs = require('fs');

console.log('🔧 Fixing UTF-8 corrupted characters...\n');

// Read as buffer first to see exact bytes
let buffer = fs.readFileSync('sapthala-admin-clean.html');
let content = buffer.toString('utf8');

console.log('File size:', buffer.length, 'bytes');

// The corrupted sequence appears as these characters when decoded
// Let's find and replace the exact string as it appears
const searches = [
    { find: "loginBtn.innerHTML = 'ðŸ"", Logging in...';", replace: "loginBtn.innerHTML = '🔄 Logging in...';", name: "Loading button" },
    { find: "showLoginSuccess('バ. Login successful! Redirecting...');", replace: "showLoginSuccess('✅ Login successful! Redirecting...');", name: "Success message" },
    { find: "showLoginError('Please \nenter both username and password');", replace: "showLoginError('Please enter both username and password');", name: "Error message" }
];

let fixCount = 0;
searches.forEach(({find, replace, name}) => {
    if (content.includes(find)) {
        content = content.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
        console.log(`✅ Fixed: ${name}`);
        fixCount++;
    } else {
        console.log(`⏭️  Skipped: ${name} (not found)`);
    }
});

// Write back
fs.writeFileSync('sapthala-admin-clean.html', content, 'utf8');

console.log(`\n✅ Applied ${fixCount} fixes!`);
console.log('🔄 Refresh browser with Ctrl+Shift+Delete then Ctrl+F5');
