const { spawn } = require('child_process');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function test() {
    const payload = 'about you the 1975';
    const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(payload)}&entity=song&limit=1`);
    const track = res.data.results[0];
    if (!track || !track.previewUrl) return console.log("not found");

    console.log("Downloading audio...", track.previewUrl);
    let audioPath = 'temp_audio.m4a';
    const audioRes = await axios.get(track.previewUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(audioPath, audioRes.data);

    let coverImg;
    try {
        const coverUrl = track.artworkUrl100.replace('100x100bb', '600x600bb');
        coverImg = await loadImage(coverUrl);
    } catch(e){}

    const width = 540;
    const height = 960;
    const fps = 15;
    const duration = 30;
    const totalFrames = fps * duration;

    console.log("Starting ffmpeg...");
    const tempVideoPath = path.join(process.cwd(), `test-out3.mp4`);
    const ffmpeg = spawn('ffmpeg', [
        '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
        '-s', `${width}x${height}`, '-pix_fmt', 'rgba', '-r', `${fps}`,
        '-i', '-', '-i', audioPath,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-t', `${duration}`,
        tempVideoPath
    ]);

    ffmpeg.stderr.on('data', d => {});
    
    ffmpeg.on('close', (code) => {
        console.log("close", code);
    });

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw static bg
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);
    if (coverImg) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(50, 100, 440, 440, 20); // Rounded corners
        ctx.clip();
        ctx.drawImage(coverImg, 50, 100, 440, 440);
        ctx.restore();
    }

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    let displayTitle = track.trackName;
    if (displayTitle.length > 22) displayTitle = displayTitle.substring(0, 20) + '...';
    ctx.fillText(displayTitle, 50, 600);

    // Artist
    ctx.fillStyle = '#b3b3b3';
    ctx.font = '24px sans-serif';
    let displayArtist = track.artistName;
    if (displayArtist.length > 30) displayArtist = displayArtist.substring(0, 28) + '...';
    ctx.fillText(displayArtist, 50, 640);

    // Playback Controls
    const btnY = 800;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(width / 2, btnY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.moveTo((width / 2) - 10, btnY - 15);
    ctx.lineTo((width / 2) + 15, btnY);
    ctx.lineTo((width / 2) - 10, btnY + 15);
    ctx.fill();

    const bgData = ctx.getImageData(0,0,width,height);

    for(let i=0; i<totalFrames; i++) {
        ctx.putImageData(bgData, 0, 0);
        
        const progress = i / totalFrames;
        const barY = 710;
        
        ctx.fillStyle = '#4d4d4d';
        ctx.beginPath(); ctx.roundRect(50, barY, 440, 6, 3); ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.roundRect(50, barY, 440 * progress, 6, 3); ctx.fill();
        
        ctx.beginPath(); ctx.arc(50 + 440 * progress, barY + 3, 8, 0, Math.PI * 2); ctx.fill();
        
        const currentSec = Math.floor(i / fps);
        ctx.fillStyle = '#b3b3b3'; ctx.font = '16px sans-serif';
        ctx.fillText(`0:${currentSec.toString().padStart(2, '0')}`, 50, barY + 30);
        ctx.textAlign = 'right';
        ctx.fillText('0:30', 490, barY + 30);
        ctx.textAlign = 'left';

        const data = ctx.getImageData(0, 0, width, height).data;
        ffmpeg.stdin.write(Buffer.from(data.buffer));
    }
    ffmpeg.stdin.end();
}
test();
