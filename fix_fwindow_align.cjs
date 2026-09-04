const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target = `
                      ctx.font = \`\${fontSize}px "Open Sans", "Noto Color Emoji"\`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      
                      // The character is on the right, so we restrict text to the left 60%
                      const textAreaWidth = targetWidth * 0.60;
                      const centerX = textAreaWidth / 2 + 30; // Center of the left blank area
                      const maxWidth = textAreaWidth - 40;
                      const startYOffset = 120; // Lower a bit for the media player title
`;

const replacement = `
                      ctx.font = \`\${fontSize}px "Open Sans", "Noto Color Emoji"\`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'left';
                      ctx.textBaseline = 'middle';
                      
                      // The character is on the right, so we restrict text to the left 60%
                      const textAreaWidth = targetWidth * 0.60;
                      const startX = 40; // Absolut kiri
                      const maxWidth = textAreaWidth - 40;
                      const startYOffset = 120; // Lower a bit for the media player title
`;

code = code.replace(target.trim(), replacement.trim());

const target2 = `
                      for (let i = 0; i < lines.length; i++) {
                          ctx.fillText(lines[i], centerX, startY);
                          startY += lineHeight;
                      }
`;

const replacement2 = `
                      for (let i = 0; i < lines.length; i++) {
                          ctx.fillText(lines[i], startX, startY);
                          startY += lineHeight;
                      }
`;
code = code.replace(target2.trim(), replacement2.trim());

fs.writeFileSync('server.ts', code);
console.log('done fwindow align');
