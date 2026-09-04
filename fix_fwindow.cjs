const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target = `
                      ctx.font = \`\${fontSize}px "Open Sans", "Noto Color Emoji"\`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      
                      const paddingX = 40;
                      const maxWidth = targetWidth - (paddingX * 2);
                      const startYOffset = 120; // Lower a bit for the media player title
                      
                      const paragraphs = text.split('\\n');
                      const lines: string[] = [];
                      
                      for (let p = 0; p < paragraphs.length; p++) {
                          const words = paragraphs[p].split(' ');
                          let currentLine = '';
                          for (let i = 0; i < words.length; i++) {
                              const testLine = currentLine + words[i] + ' ';
                              const testWidth = ctx.measureText(testLine).width;
                              if (testWidth > maxWidth && i > 0) {
                                  lines.push(currentLine.trim());
                                  currentLine = words[i] + ' ';
                              } else {
                                  currentLine = testLine;
                              }
                          }
                          lines.push(currentLine.trim());
                      }
                      
                      const lineHeight = fontSize * 1.2;
                      const totalHeight = lines.length * lineHeight;
                      
                      // Calculate center Y within the white box area
                      // The white box starts roughly around startYOffset, and ends roughly at targetHeight - 150
                      const whiteBoxHeight = targetHeight - startYOffset - 150;
                      let startY = startYOffset + (whiteBoxHeight / 2) - (totalHeight / 2) + (lineHeight / 2);
                      
                      const centerX = targetWidth / 2;
                      
                      for (let i = 0; i < lines.length; i++) {
                          ctx.fillText(lines[i], centerX, startY);
                          startY += lineHeight;
                      }
`;

const replacement = `
                      ctx.font = \`\${fontSize}px "Open Sans", "Noto Color Emoji"\`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      
                      // The character is on the right, so we restrict text to the left 60%
                      const textAreaWidth = targetWidth * 0.60;
                      const centerX = textAreaWidth / 2 + 30; // Center of the left blank area
                      const maxWidth = textAreaWidth - 40;
                      const startYOffset = 120; // Lower a bit for the media player title
                      
                      const paragraphs = text.split('\\n');
                      const lines: string[] = [];
                      
                      for (let p = 0; p < paragraphs.length; p++) {
                          const words = paragraphs[p].split(' ');
                          let currentLine = '';
                          for (let i = 0; i < words.length; i++) {
                              const testLine = currentLine + words[i] + ' ';
                              const testWidth = ctx.measureText(testLine).width;
                              if (testWidth > maxWidth && i > 0) {
                                  lines.push(currentLine.trim());
                                  currentLine = words[i] + ' ';
                              } else {
                                  currentLine = testLine;
                              }
                          }
                          lines.push(currentLine.trim());
                      }
                      
                      const lineHeight = fontSize * 1.2;
                      const totalHeight = lines.length * lineHeight;
                      
                      // Calculate center Y within the white box area
                      const whiteBoxHeight = targetHeight - startYOffset - 150;
                      let startY = startYOffset + (whiteBoxHeight / 2) - (totalHeight / 2) + (lineHeight / 2) - 20; // Shift up a little
                      
                      for (let i = 0; i < lines.length; i++) {
                          ctx.fillText(lines[i], centerX, startY);
                          startY += lineHeight;
                      }
`;

code = code.replace(target.trim(), replacement.trim());
fs.writeFileSync('server.ts', code);
console.log('done fwindow');
