const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

console.time('frames');
const canvas = createCanvas(720, 1280);
const ctx = canvas.getContext('2d');

for(let i=0; i<300; i++) {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0,0,720,1280);
    ctx.fillStyle = 'white';
    ctx.fillRect(50, 1000, i*2, 10);
    const buf = canvas.toBuffer('image/jpeg');
}
console.timeEnd('frames');
