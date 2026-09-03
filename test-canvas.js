import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

async function test() {
  try {
    const img = await loadImage('fwindow.jpg');
    const canvas = createCanvas(800, (800 / img.width) * img.height);
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Draw text with emoji
    ctx.font = '50px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Open Sans", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('Testing emoji 😂🔥', canvas.width / 2, canvas.height / 2);
    
    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync('test-canvas-out.jpg', buffer);
    console.log('Success!');
  } catch (err) {
    console.error(err);
  }
}
test();
