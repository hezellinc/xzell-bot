const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function main() {
    const img = await loadImage('thumbnail.menu.jpg');
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const fontSize = Math.max(20, Math.floor(img.height / 10));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.max(2, Math.floor(fontSize / 10));
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';

    const drawMemeText = (text, x, y) => {
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            const yPos = y + (i * fontSize * 1.2);
            ctx.strokeText(line, x, yPos);
            ctx.fillText(line, x, yPos);
        });
    };

    ctx.textBaseline = 'top';
    drawMemeText('TEST ATAS', img.width / 2, 10);

    ctx.textBaseline = 'bottom';
    drawMemeText('TEST BAWAH', img.width / 2, img.height - 10);

    const out = await canvas.encode('png');
    fs.writeFileSync('test-meme-out.png', out);
    console.log("Done");
}
main();
