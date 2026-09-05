const { GlobalFonts } = require('@napi-rs/canvas');
console.log(GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 'MySansBold'));
console.log(GlobalFonts.families);
