const { spawn } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

async function test() {
    const text = 'malas menanggapi';
    const words = text.split(' ');
    const width = 512;
    const height = 512;
    const fps = 10;
    const framesPerWord = 5;
    
    const ffmpeg = spawn('ffmpeg', [
        '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
        '-s', `${width}x${height}`, '-pix_fmt', 'rgba', '-r', `${fps}`,
        '-i', '-', 
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        'brat-test2.mp4'
    ]);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    let currentWords = [];
    for (let i = 0; i < words.length; i++) {
        currentWords.push(words[i]);
        
        ctx.fillStyle = '#8ACE00';
        ctx.fillRect(0,0,width,height);
        
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.filter = 'blur(2px)';
        
        // Compute max font size that fits the longest word
        let fontSize = 120;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        
        // Find widest word
        let maxW = 0;
        for(let w of currentWords) {
            let m = ctx.measureText(w).width * 0.7; // considering scale
            if (m > maxW) maxW = m;
        }
        
        if (maxW > width - 40) {
            fontSize = Math.floor(fontSize * ((width - 40) / maxW));
        }
        const totalHeight = currentWords.length * fontSize;
        if (totalHeight > height - 40) {
            fontSize = Math.floor(fontSize * ((height - 40) / totalHeight));
        }
        
        ctx.font = `${fontSize}px Arial, sans-serif`;
        let startY = (height - (currentWords.length * fontSize)) / 2 + (fontSize/2);
        
        ctx.save();
        ctx.translate(width/2, 0);
        ctx.scale(0.7, 1.1); // Make it narrow and tall
        
        for(let j=0; j<currentWords.length; j++) {
            ctx.fillText(currentWords[j], 0, startY + (j*fontSize));
        }
        ctx.restore();
        
        const data = ctx.getImageData(0, 0, width, height).data;
        const buf = Buffer.from(data.buffer);
        
        for(let f=0; f<framesPerWord; f++) {
            ffmpeg.stdin.write(buf);
        }
    }
    
    // Hold last frame
    const data = ctx.getImageData(0, 0, width, height).data;
    const buf = Buffer.from(data.buffer);
    for(let f=0; f<fps * 1.5; f++) {
        ffmpeg.stdin.write(buf);
    }
    
    ffmpeg.stdin.end();
}
test();
