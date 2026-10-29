export const normalizeServiceUrl = (url: string) =>
  url.endsWith('/info.json') ? url : `${url.endsWith('/') ? url : `${url}/`}info.json`;

export const getPixelSizeFromServiceUrl = (serviceUrl: string) => () =>
  fetch(serviceUrl).then(res => res.json()).then(data => {
    const width: number = data.width;
    const height: number = data.height;
    return (width !== undefined && height !== undefined) ? { width, height } : undefined;
  });