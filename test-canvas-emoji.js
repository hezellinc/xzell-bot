import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

GlobalFonts.registerFromPath('./assets/OpenSans-Regular.ttf', 'Open Sans');
GlobalFonts.registerFromPath('./assets/NotoColorEmoji.ttf', 'Noto Color Emoji');

async function test() {
  try {
    const img = await loadImage('fwindow.jpg');
    const canvas = createCanvas(800, (800 / img.width) * img.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    ctx.font = '50px "Open Sans", "Noto Color Emoji"';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('Testing emoji 😂🔥 with Open Sans', canvas.width / 2, canvas.height / 2);
    
    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync('test-canvas-out.jpg', buffer);
    console.log('Success!');
  } catch (err) {
    console.error(err);
  }
}
test();
