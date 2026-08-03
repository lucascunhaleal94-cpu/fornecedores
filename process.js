import { Jimp } from 'jimp';

async function processImage() {
  console.log("Reading image...");
  // Use Jimp.read or just Jimp constructor depending on version
  let image;
  try {
    image = await Jimp.read('./public/logo-original.png');
  } catch (e) {
    // Fallback for different Jimp version
    const defaultExport = (await import('jimp')).default;
    image = await defaultExport.read('./public/logo-original.png');
  }
  
  console.log("Processing pixels...");
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    const brightness = (r + g + b) / 3;
    
    if (brightness > 240) {
      this.bitmap.data[idx + 3] = 0; // Transparent
    } else {
      this.bitmap.data[idx + 0] = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
      
      let newAlpha = (255 - brightness) * 1.8;
      if (newAlpha > 255) newAlpha = 255;
      this.bitmap.data[idx + 3] = newAlpha;
    }
  });

  console.log("Saving image...");
  try {
    await image.write('./public/logo-white.png');
  } catch(e) {
    await image.writeAsync('./public/logo-white.png');
  }
  console.log("Done!");
}

processImage().catch(console.error);
