const { spawn } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

async function test() {
    const text = 'malas menanggapi kocak gaming';
    const words = text.split(' ');
    const width = 512;
    const height = 512;
    const fps = 10;
    const framesPerWord = 5; // 0.5 sec per word
    
    const ffmpeg = spawn('ffmpeg', [
        '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
        '-s', `${width}x${height}`, '-pix_fmt', 'rgba', '-r', `${fps}`,
        '-i', '-', 
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        'brat-test.mp4'
    ]);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    let currentWords = [];
    for (let i = 0; i < words.length; i++) {
        currentWords.push(words[i]);
        const displayString = currentWords.join('\n');
        
        ctx.fillStyle = '#8ACE00';
        ctx.fillRect(0,0,width,height);
        
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Auto sizing font
        let fontSize = 100;
        ctx.font = `bold ${fontSize}px Arial`;
        // VERY simplified sizing
        
        ctx.filter = 'blur(2px)';
        const lines = currentWords;
        const totalHeight = lines.length * fontSize;
        let startY = (height - totalHeight) / 2 + (fontSize/2);
        
        for(let j=0; j<lines.length; j++) {
            ctx.fillText(lines[j], width/2, startY + (j*fontSize));
        }
        
        const data = ctx.getImageData(0, 0, width, height).data;
        const buf = Buffer.from(data.buffer);
        
        for(let f=0; f<framesPerWord; f++) {
            ffmpeg.stdin.write(buf);
        }
    }
    
    // Hold last frame for 1 second
    const data = ctx.getImageData(0, 0, width, height).data;
    const buf = Buffer.from(data.buffer);
    for(let f=0; f<fps; f++) {
        ffmpeg.stdin.write(buf);
    }
    
    ffmpeg.stdin.end();
}
test();
