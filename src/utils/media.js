/**
 * Utility to ensure all JioSaavn and artist artwork URLs are upgraded to highest quality (500x500 px)
 */
export function get500x500Image(url) {
  if (!url || typeof url !== 'string') {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
  }
  return url
    .replace(/\/50x50\//g, '/500x500/')
    .replace(/\/150x150\//g, '/500x500/')
    .replace(/\/250x250\//g, '/500x500/')
    .replace(/_50x50\./g, '_500x500.')
    .replace(/_150x150\./g, '_500x500.')
    .replace(/_250x250\./g, '_500x500.')
    .replace(/-50x50\./g, '-500x500.')
    .replace(/-150x150\./g, '-500x500.')
    .replace(/-250x250\./g, '-500x500.');
}

// In-memory cache for extracted colors
const colorCache = new Map();

/**
 * Fast client-side dominant color extractor using downsampled Canvas
 * Returns an RGB string e.g. "45, 55, 72"
 */
export function extractDominantColor(imgUrl) {
  if (!imgUrl) return Promise.resolve('20, 20, 22');
  if (colorCache.has(imgUrl)) return Promise.resolve(colorCache.get(imgUrl));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imgUrl;

    const fallback = () => {
      // Deterministic hash fallback to dark sophisticated tones if CORS restricts canvas reading
      let hash = 0;
      for (let i = 0; i < imgUrl.length; i++) {
        hash = (hash << 5) - hash + imgUrl.charCodeAt(i);
        hash |= 0;
      }
      const r = Math.min(65, Math.max(15, Math.abs(hash) % 55 + 15));
      const g = Math.min(65, Math.max(15, Math.abs(hash >> 3) % 55 + 15));
      const b = Math.min(75, Math.max(20, Math.abs(hash >> 6) % 60 + 20));
      const col = `${r}, ${g}, ${b}`;
      colorCache.set(imgUrl, col);
      resolve(col);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return fallback();
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Avoid near-pure black or near-pure white to find rich tones
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (avg > 15 && avg < 240) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
        if (count === 0) return fallback();
        // Tone down to moody, luxury dark tint
        const finalR = Math.round((r / count) * 0.45);
        const finalG = Math.round((g / count) * 0.45);
        const finalB = Math.round((b / count) * 0.45);
        const result = `${finalR}, ${finalG}, ${finalB}`;
        colorCache.set(imgUrl, result);
        resolve(result);
      } catch (err) {
        fallback();
      }
    };

    img.onerror = fallback;
  });
}

// In-memory cache for edge colors
const edgeColorCache = new Map();

/**
 * Extracts top edge color and bottom edge color specifically from the image
 * Returns { topRgb: string, bottomRgb: string }
 */
export function extractEdgeColors(imgUrl) {
  if (!imgUrl) return Promise.resolve({ topRgb: '18, 18, 20', bottomRgb: '12, 12, 14' });
  if (edgeColorCache.has(imgUrl)) return Promise.resolve(edgeColorCache.get(imgUrl));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imgUrl;

    const fallback = () => {
      let hash = 0;
      for (let i = 0; i < imgUrl.length; i++) {
        hash = (hash << 5) - hash + imgUrl.charCodeAt(i);
        hash |= 0;
      }
      const r1 = Math.min(60, Math.max(15, (Math.abs(hash) % 45) + 12));
      const g1 = Math.min(60, Math.max(15, ((Math.abs(hash) >> 2) % 45) + 12));
      const b1 = Math.min(70, Math.max(18, ((Math.abs(hash) >> 4) % 50) + 16));

      const r2 = Math.min(50, Math.max(10, ((Math.abs(hash) >> 1) % 35) + 8));
      const g2 = Math.min(50, Math.max(10, ((Math.abs(hash) >> 3) % 35) + 8));
      const b2 = Math.min(60, Math.max(12, ((Math.abs(hash) >> 5) % 40) + 10));

      const res = {
        topRgb: `${r1}, ${g1}, ${b1}`,
        bottomRgb: `${r2}, ${g2}, ${b2}`
      };
      edgeColorCache.set(imgUrl, res);
      resolve(res);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return fallback();
        ctx.drawImage(img, 0, 0, size, size);

        // Top edge: first 4 rows (y = 0 to 3)
        const topData = ctx.getImageData(0, 0, size, 4).data;
        let tr = 0, tg = 0, tb = 0, tcount = 0;
        for (let i = 0; i < topData.length; i += 4) {
          tr += topData[i];
          tg += topData[i + 1];
          tb += topData[i + 2];
          tcount++;
        }

        // Bottom edge: last 4 rows (y = 28 to 31)
        const bottomData = ctx.getImageData(0, size - 4, size, 4).data;
        let br = 0, bg = 0, bb = 0, bcount = 0;
        for (let i = 0; i < bottomData.length; i += 4) {
          br += bottomData[i];
          bg += bottomData[i + 1];
          bb += bottomData[i + 2];
          bcount++;
        }

        if (tcount === 0 || bcount === 0) return fallback();

        const topRgb = `${Math.round(tr / tcount)}, ${Math.round(tg / tcount)}, ${Math.round(tb / tcount)}`;
        const bottomRgb = `${Math.round(br / bcount)}, ${Math.round(bg / bcount)}, ${Math.round(bb / bcount)}`;

        const result = { topRgb, bottomRgb };
        edgeColorCache.set(imgUrl, result);
        resolve(result);
      } catch (e) {
        fallback();
      }
    };

    img.onerror = fallback;
  });
}


