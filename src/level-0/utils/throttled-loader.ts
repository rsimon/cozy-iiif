import pThrottle from 'p-throttle';

interface ThrottledLoaderOpts {

  callsPerSecond?: number;

}

export const getThrottledLoader = (
  opts?: ThrottledLoaderOpts
) => {
  const throttle = pThrottle({
    limit: opts?.callsPerSecond ?? 5,
    interval: 1000
  });

  const loadImage = throttle((url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  }));

  return { loadImage };

}