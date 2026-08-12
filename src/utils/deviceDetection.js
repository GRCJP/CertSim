// Device detection utilities for optional Kindle support

export const isKindleDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isKindle = (
    userAgent.includes('kindle') || // Kindle devices / Experimental Browser
    userAgent.includes('kindal') || // legacy typo-safe match
    userAgent.includes('silk') ||   // Silk browser (Fire tablets)
    userAgent.includes('kftt') ||   // Kindle Fire
    userAgent.includes('kfot') ||   // Kindle Fire
    userAgent.includes('kfjwi') ||  // Kindle Fire HD
    userAgent.includes('kfjwa') ||  // Kindle Fire HD
    userAgent.includes('kfsowi') || // Kindle Fire HDX
    userAgent.includes('kfthwi') || // Kindle Fire HDX
    userAgent.includes('kfapwi') || // Kindle Fire HDX 8.9
    userAgent.includes('kfars') ||  // Kindle Fire HDX 8.9
    userAgent.includes('kfauwi') || // Kindle Fire HDX 8.9
    userAgent.includes('kfmewi') || // Kindle Fire HD 6
    userAgent.includes('kfgiwi') || // Kindle Fire HD 7
    userAgent.includes('kfmeiw') || // Kindle Fire HD 8
    userAgent.includes('kfsawi') || // Kindle Fire HD 10
    userAgent.includes('kfawhi') || // Kindle Fire HDX 8.9
    userAgent.includes('kfzwai')    // Kindle Fire HDX 8.9
  );
  
  return isKindle;
};

export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const shouldShowKindleMode = () => {
  // Only show Kindle mode toggle on Kindle devices
  return isKindleDevice();
};

export const getDeviceType = () => {
  if (isKindleDevice()) return 'kindle';
  if (isTouchDevice()) return 'mobile';
  return 'desktop';
};
