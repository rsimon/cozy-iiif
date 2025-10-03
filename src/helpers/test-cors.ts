import type { CozyCanvas } from '../types';

export const testCORS = (canvas: CozyCanvas): Promise<boolean> => {
  const image = canvas.images[0];
  if (!image) return Promise.resolve(false);

  let testURL: string;
  if (image.type === 'static') {
    testURL = image.url;
  } else {
    testURL = image.getImageURL(100);
  }

  return new Promise(resolve => {
    const img = new Image();

    let corsSupported = false;
    
    img.onload = () => {
      corsSupported = true;
      resolve(true);
    };
    
    img.onerror = () => {
      resolve(false);
    };
    
    // Set a timeout in case it hangs
    setTimeout(() => resolve(corsSupported), 5000);
    
    img.crossOrigin = 'anonymous';
    img.src = testURL;
  });

}