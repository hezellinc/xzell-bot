import { Jimp, loadFont, HorizontalAlign, VerticalAlign } from 'jimp';

async function test() {
  try {
    const img = await Jimp.read('fwindow.jpg');
    img.resize({ w: 800 });
    
    // We can also load from the node_modules path
    const font = await loadFont('node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-64-black/open-sans-64-black.fnt');
    
    img.print({
      font,
      x: 0, 
      y: 0, 
      text: {
        text: "Testing 123",
        alignmentX: HorizontalAlign.CENTER,
        alignmentY: VerticalAlign.MIDDLE
      }, 
      maxWidth: 800, 
      maxHeight: img.bitmap.height
    });
    
    await img.write('test-out.jpg');
    console.log('Success!');
  } catch (err) {
    console.error(err);
  }
}
test();
