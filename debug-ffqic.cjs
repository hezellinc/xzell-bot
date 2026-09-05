const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function test() {
    const assetPath = 'assets/set1.jpeg';
    if (!fs.existsSync(assetPath)) return console.log("no asset");
    const img = await loadImage(assetPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    ctx.fillStyle = '#FFE9A6';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillText("Ini Teks Coba", 460, 1045);
    
    // Draw crosshair at 460, 1045
    ctx.fillStyle = 'red';
    ctx.fillRect(460 - 5, 1045 - 5, 10, 10);
    
    fs.writeFileSync('debug-ffqic.jpeg', canvas.toBuffer('image/jpeg'));
    console.log("Done");
}
test();
