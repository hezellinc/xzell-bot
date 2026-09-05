const { spawn } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

async function test() {
    const trackPreview = 'https://cdns-preview-1.dzcdn.net/stream/c-1f5be6e2029517117df2da2e1bd582ee-7.mp3';
    const width = 540;
    const height = 960;
    const fps = 15;
    const duration = 10;
    const totalFrames = fps * duration;

    const ffmpeg = spawn('ffmpeg', [
        '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
        '-s', `${width}x${height}`, '-pix_fmt', 'rgba', '-r', `${fps}`,
        '-i', '-', '-i', trackPreview,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-t', `${duration}`,
        'test-out.mp4'
    ]);

    ffmpeg.stderr.on('data', d => console.log(d.toString()));
    
    ffmpeg.on('close', (code) => {
        console.log("close", code);
    });

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    for(let i=0; i<totalFrames; i++) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0,0,width,height);
        const data = ctx.getImageData(0, 0, width, height).data;
        ffmpeg.stdin.write(Buffer.from(data.buffer));
    }
    ffmpeg.stdin.end();
}
test();
