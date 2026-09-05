const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

const canvas = createCanvas(200, 100);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'white';
ctx.fillRect(0,0,200,100);
ctx.fillStyle = 'black';
ctx.font = '30px sans-serif';
ctx.fillText('Hello', 50, 50);

fs.writeFileSync('test-font.png', canvas.toBuffer('image/png'));
console.log(fs.statSync('test-font.png').size);
