const { createCanvas } = require('@napi-rs/canvas');
const { spawn } = require('child_process');

console.time('render');
const width = 540;
const height = 960;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const fps = 15;
const duration = 10;
const totalFrames = fps * duration;

const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', `${width}x${height}`,
    '-pix_fmt', 'rgba',
    '-r', `${fps}`,
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    'out-raw.mp4'
]);

ffmpeg.stderr.on('data', d => {});
ffmpeg.on('close', () => {
    console.timeEnd('render');
});

for(let i=0; i<totalFrames; i++) {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle = 'white';
    ctx.fillRect(50, 800, i*2, 10);
    const data = ctx.getImageData(0, 0, width, height).data;
    ffmpeg.stdin.write(Buffer.from(data.buffer));
}
ffmpeg.stdin.end();
