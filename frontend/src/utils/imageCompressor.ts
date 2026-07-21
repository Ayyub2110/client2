/**
 * Compresses a base64 image or File object using HTML5 Canvas
 * Reduces file sizes by 80-90% before uploading to database or storage
 */
export async function compressBase64Image(
  base64Str: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions respecting aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed WebP or JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export async function compressFileImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.75
): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) {
        resolve(file);
        return;
      }

      const compressedBase64 = await compressBase64Image(base64, maxWidth, maxWidth, quality);
      
      // Convert back to File object
      const res = await fetch(compressedBase64);
      const blob = await res.blob();
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      resolve(compressedFile);
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
