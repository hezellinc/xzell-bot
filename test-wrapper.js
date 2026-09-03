import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

GlobalFonts.registerFromPath('./assets/OpenSans-Regular.ttf', 'Open Sans');
GlobalFonts.registerFromPath('./assets/NotoColorEmoji.ttf', 'Noto Color Emoji');

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxHeight) {
    const paragraphs = text.split('\n');
    let lines = [];
    
    for (let p = 0; p < paragraphs.length; p++) {
        const words = paragraphs[p].split(' ');
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
    }
    
    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);
    
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, startY);
        startY += lineHeight;
    }
}

async function test() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);
  
  ctx.font = '64px "Open Sans", "Noto Color Emoji"';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  wrapText(ctx, "Ini tes brat pake emoji 😂 🍎 🚗", 256, 256, 472, 70, 472);
  
  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync('test-brat.jpg', buffer);
  console.log('Success');
}
test();
