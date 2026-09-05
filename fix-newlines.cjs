const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/split\('[\r\n]+'\)/g, "split('\\n')");
code = code.replace(/split\('[\r\n]+ \'\)/g, "split('\\n ')"); // if there was '\n '

// replace the one in menuText if needed. Wait, menuText is a template literal.
// So '\n' became literal newline, which is actually valid in a template literal!
// The problem is ONLY with single or double quotes where a newline is syntax error.

// Let's find all unterminated single/double string literals:
const lines = code.split('\n');
for (let i=0; i<lines.length; i++) {
    const l = lines[i];
    // if line ends with unescaped ' or " and next line starts with ' or "
    if (l.match(/['"]\s*$/)) {
       // it's tricky.
    }
}

fs.writeFileSync('server.ts.fixed', code);
