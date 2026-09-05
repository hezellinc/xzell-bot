const fs = require('fs');
const { loadImage } = require('@napi-rs/canvas');
async function run() {
    for (let i = 1; i <= 5; i++) {
        try {
            const img = await loadImage(`assets/set${i}.jpeg`);
            console.log(`set${i}.jpeg: ${img.width}x${img.height}`);
        } catch(e) { console.log(e.message); }
    }
}
run();
