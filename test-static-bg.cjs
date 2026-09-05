const { createCanvas } = require('@napi-rs/canvas');
const { spawn } = require('child_process');

console.time('render');
const width = 540;
const height = 960;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const fps = 15;
const duration = 30; // 30 seconds
const totalFrames = fps * duration;

// Static BG
ctx.fillStyle = '#121212';
ctx.fillRect(0,0,width,height);
ctx.fillStyle = '#1ed760';
ctx.fillRect(50, 100, 440, 440); // Fake cover
ctx.fillStyle = 'white';
ctx.font = 'bold 30px sans-serif';
ctx.fillText('About You', 50, 580);
ctx.fillStyle = '#b3b3b3';
ctx.font = '24px sans-serif';
ctx.fillText('The 1975', 50, 620);
// Play button
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(270, 780, 35, 0, Math.PI * 2);
ctx.fill();

const bgData = ctx.getImageData(0,0,width,height);

const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', `${width}x${height}`,
    '-pix_fmt', 'rgba',
    '-r', `${fps}`,
    '-i', '-',
    // dummy audio for test
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-t', `${duration}`,
    'out-test.mp4'
]);

ffmpeg.stderr.on('data', d => {});
ffmpeg.on('close', () => {
    console.timeEnd('render');
});

for(let i=0; i<totalFrames; i++) {
    ctx.putImageData(bgData, 0, 0);
    
    // Progress bar
    const progress = i / totalFrames;
    ctx.fillStyle = '#4d4d4d';
    ctx.fillRect(50, 680, 440, 4);
    ctx.fillStyle = 'white';
    ctx.fillRect(50, 680, 440 * progress, 4);
    
    // Dot
    ctx.beginPath();
    ctx.arc(50 + 440 * progress, 682, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Time
    const currentSec = Math.floor(i / fps);
    const timeStr = `0:${currentSec.toString().padStart(2, '0')}`;
    ctx.fillStyle = '#b3b3b3';
    ctx.font = '16px sans-serif';
    ctx.fillText(timeStr, 50, 705);
    ctx.fillText('0:30', 455, 705);
    
    const data = ctx.getImageData(0, 0, width, height).data;
    ffmpeg.stdin.write(Buffer.from(data.buffer));
}
ffmpeg.stdin.end();
