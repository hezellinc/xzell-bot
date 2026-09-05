const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function test() {
    const img = await loadImage('assets/set1.jpeg');
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    ctx.fillStyle = '#FFF2C7'; // Pale yellow
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText("ProPlayer123...", 450, 1050);
    
    fs.writeFileSync('test-ff.jpeg', canvas.toBuffer('image/jpeg'));
    console.log("Done");
}
test();
