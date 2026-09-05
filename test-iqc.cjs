const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

const width = 1080;
const height = 1920;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#111111';
ctx.fillRect(0, 0, width, height);

const drawRoundRect = (x, y, w, h, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

// Layout metrics
const msgText = "Are you okey?";
const timeText = "23.17";

ctx.font = '40px sans-serif';
const msgWidth = ctx.measureText(msgText).width;
ctx.font = '28px sans-serif';
const timeWidth = ctx.measureText(timeText).width;

const bubbleWidth = Math.max(300, msgWidth + timeWidth + 80);
const bubbleHeight = 90;
const startX = 100;
const startY = 800;

// Draw Reaction Pill
const reactionText = "👍 ❤️ 😂 😮 😢 🙏 ➕";
drawRoundRect(startX, startY - 90, 480, 80, 40, '#2A2B2D');
ctx.font = '35px "Noto Color Emoji"';
ctx.fillText(reactionText, startX + 20, startY - 35);

// Draw Message Bubble
drawRoundRect(startX, startY, bubbleWidth, bubbleHeight, 25, '#1F2023');
ctx.fillStyle = 'white';
ctx.font = '40px sans-serif';
ctx.fillText(msgText, startX + 30, startY + 58);
ctx.fillStyle = '#7E7F83';
ctx.font = '28px sans-serif';
ctx.fillText(timeText, startX + bubbleWidth - timeWidth - 20, startY + 62);

// Draw Context Menu
const menuWidth = 500;
const menuY = startY + bubbleHeight + 20;
const itemHeight = 90;
const items = [
    { text: "Star", icon: "⭐" },
    { text: "Reply", icon: "↩️" },
    { text: "Forward", icon: "↪️" },
    { text: "Copy", icon: "📄" },
    { text: "Pin", icon: "📌" },
    { text: "Report", icon: "⚠️" },
    { text: "Delete", icon: "🗑️", color: "#FF453A" }
];

drawRoundRect(startX, menuY, menuWidth, items.length * itemHeight, 35, '#252525');

items.forEach((item, index) => {
    const y = menuY + (index * itemHeight);
    
    ctx.fillStyle = item.color || 'white';
    ctx.font = '40px sans-serif';
    ctx.fillText(item.text, startX + 40, y + 60);
    
    ctx.font = '35px "Noto Color Emoji"';
    ctx.fillText(item.icon, startX + menuWidth - 80, y + 60);

    if (index < items.length - 1) {
        ctx.fillStyle = '#3A3A3C';
        ctx.fillRect(startX + 30, y + itemHeight, menuWidth - 60, 2);
    }
});

fs.writeFileSync('iqc-test.png', canvas.toBuffer('image/png'));
console.log("Done");
