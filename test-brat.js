import { Jimp, loadFont, HorizontalAlign, VerticalAlign } from 'jimp';
async function test() {
    const img = new Jimp({ width: 512, height: 512, color: 0xffffffff });
    const font = await loadFont('node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-64-black/open-sans-64-black.fnt');
    img.print({
        font,
        x: 20,
        y: 20,
        text: {
            text: "Testing Brat",
            alignmentX: HorizontalAlign.CENTER,
            alignmentY: VerticalAlign.MIDDLE
        },
        maxWidth: 472,
        maxHeight: 472
    });
    await img.write('test-brat.jpg');
}
test().catch(console.error);
