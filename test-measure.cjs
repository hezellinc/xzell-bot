const { createCanvas } = require('@napi-rs/canvas');
const canvas = createCanvas(200, 100);
const ctx = canvas.getContext('2d');
ctx.font = 'bold 28px sans-serif';
console.log(ctx.measureText('Budi').width);
