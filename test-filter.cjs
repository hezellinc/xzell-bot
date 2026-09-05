const { createCanvas } = require('@napi-rs/canvas');
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');
ctx.filter = 'blur(4px)';
ctx.fillStyle = 'black';
ctx.fillText('hello', 50, 50);
console.log("OK");
