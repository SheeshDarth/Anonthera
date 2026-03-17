export const detectScript = (text) => {
  if (/[\u0900-\u097F]/.test(text)) return 'हिंदी';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'தமிழ்';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'తెలుగు';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'ಕನ್ನಡ';
  return 'English';
};
