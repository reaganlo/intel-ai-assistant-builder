import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Font imports - these will be loaded conditionally
const loadJapaneseFont = async () => {
  try {
    await import('@fontsource/noto-sans-jp/300.css');
    await import('@fontsource/noto-sans-jp/400.css');
    await import('@fontsource/noto-sans-jp/500.css');
    await import('@fontsource/noto-sans-jp/700.css');
  } catch (error) {
    console.error('Failed to load Japanese fonts:', error);
  }
};

// Font family configurations based on locale
const getFontFamily = (locale) => {
  switch (locale) {
    case 'ja-JP':
      return '"Noto Sans JP", "Hiragino Kaku Gothic Pro", "ヒラギノ角ゴ Pro W3", "メイリオ", "Meiryo", sans-serif';
    case 'zh-Hans':
    case 'zh-Hant':
      return '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", sans-serif';
    default:
      return '"Roboto", "Helvetica", "Arial", sans-serif';
  }
};

const FontProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  useEffect(() => {
    const loadFontsForLocale = async () => {
      // Load Japanese fonts when Japanese locale is selected
      if (currentLanguage === 'ja-JP') {
        await loadJapaneseFont();
      }
      
      // Set CSS custom property for font family
      const fontFamily = getFontFamily(currentLanguage);
      document.documentElement.style.setProperty('--locale-font-family', fontFamily);
      
      // Also update the body font family directly
      document.body.style.fontFamily = fontFamily;
    };

    loadFontsForLocale();
  }, [currentLanguage]);

  // Apply font family to the wrapper
  const fontFamily = getFontFamily(currentLanguage);
  
  return (
    <div style={{ fontFamily, height: '100%' }}>
      {children}
    </div>
  );
};

export default FontProvider;