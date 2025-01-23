import fs from 'fs';
import path from 'path';

export function getBase64Images() {
  const images = {};
  const imagesDir = path.join(process.cwd(), 'public', 'images');

  try {
    const files = fs.readdirSync(imagesDir);
    files.forEach(file => {
      const filePath = path.join(imagesDir, file);
      const data = fs.readFileSync(filePath);
      const base64 = Buffer.from(data).toString('base64');
      const mimeType = file.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
      images[file] = `data:${mimeType};base64,${base64}`;
    });
  } catch (error) {
    console.error('Error reading images:', error);
  }

  return images;
}