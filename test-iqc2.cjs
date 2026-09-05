const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

const width = 1080;
const height = 1920;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#0F1010';
ctx.fillRect(0, 0, width, height);

const drawRoundRect = (x, y, w, h, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

const msgText = "Are you okey?";
const timeText = "23.17";

ctx.font = '40px sans-serif';
const words = msgText.split(' ');
let lines = [];
let currentLine = '';
const maxBubbleTextWidth = 700;

for (let i = 0; i < words.length; i++) {
    let testLine = currentLine + words[i] + ' ';
    let testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxBubbleTextWidth && i > 0) {
        lines.push(currentLine.trim());
        currentLine = words[i] + ' ';
    } else {
        currentLine = testLine;
    }
}
lines.push(currentLine.trim());

ctx.font = '28px sans-serif';
const timeWidth = ctx.measureText(timeText).width;

let longestLineW = 0;
ctx.font = '40px sans-serif';
lines.forEach(l => {
    let w = ctx.measureText(l).width;
    if(w > longestLineW) longestLineW = w;
});

const isSingleLine = lines.length === 1;
let bubbleWidth = 0;
if (isSingleLine) {
    bubbleWidth = longestLineW + timeWidth + 60;
} else {
    bubbleWidth = Math.max(longestLineW + 40, timeWidth + 40);
}

const lineHeight = 50;
const bubbleHeight = (lines.length * lineHeight) + (isSingleLine ? 30 : 50);

const bubbleX = 40;
const startY = 800;

const reactionText = "👍 ❤️ 😂 😮 😢 🙏 ➕";
drawRoundRect(bubbleX, startY - 90, 480, 80, 40, '#2A2B2D');
ctx.font = '35px "Noto Color Emoji"';
ctx.fillText(reactionText, bubbleX + 20, startY - 35);

drawRoundRect(bubbleX, startY, bubbleWidth, bubbleHeight, 25, '#1F2023');
ctx.fillStyle = 'white';
ctx.font = '40px sans-serif';
lines.forEach((l, i) => {
    ctx.fillText(l, bubbleX + 20, startY + 50 + (i * lineHeight));
});

ctx.fillStyle = '#7E7F83';
ctx.font = '28px sans-serif';
ctx.fillText(timeText, bubbleX + bubbleWidth - timeWidth - 20, startY + bubbleHeight - 15);

const menuWidth = 500;
const menuY = startY + bubbleHeight + 20;
const itemHeight = 85;
const items = [
    { text: "Star", icon: "⭐" },
    { text: "Reply", icon: "↩️" },
    { text: "Forward", icon: "↪️" },
    { text: "Copy", icon: "📄" },
    { text: "Pin", icon: "📌" },
    { text: "Report", icon: "⚠️" },
    { text: "Delete", icon: "🗑️", color: "#FF453A" }
];

drawRoundRect(bubbleX, menuY, menuWidth, items.length * itemHeight, 35, '#252525');

items.forEach((item, index) => {
    const y = menuY + (index * itemHeight);
    
    ctx.fillStyle = item.color || 'white';
    ctx.font = '35px sans-serif';
    ctx.fillText(item.text, bubbleX + 40, y + 55);
    
    ctx.font = '35px "Noto Color Emoji"';
    ctx.fillText(item.icon, bubbleX + menuWidth - 70, y + 55);

    if (index < items.length - 1) {
        ctx.fillStyle = '#3A3A3C';
        ctx.fillRect(bubbleX + 30, y + itemHeight, menuWidth - 60, 2);
    }
});

fs.writeFileSync('iqc-test2.png', canvas.toBuffer('image/png'));
console.log("Done");
