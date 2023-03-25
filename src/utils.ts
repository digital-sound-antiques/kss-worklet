export const isSafari = (() => {
  if ((navigator as any).userAgentData) {
    // Chrome Client Hints exist.
    console.log((navigator as any).userAgentData);
  }
  const maybeSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (maybeSafari) {
    if (/google/i.test(navigator.vendor)) {
      // A fake Safari that may be a mobile simulator on Chrome.
      return false;
    }
    return true;
  }
  return false;
})();

export const isChrome = (() => {
  const uad = (navigator as any).userAgentData;
  if (uad && uad?.brands[0]?.brand == 'Google Chrome') {
    return true;
  }
  return false;
})();