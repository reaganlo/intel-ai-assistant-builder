import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import useDataStore from "../../stores/DataStore";

// wrapper to apply consistent global assistant themes across different webview windows
const GlobalThemeProvider = ({ 
    children, 
    isSubWindow=true,
}) => {
    const { assistant } = useDataStore();
    const { i18n } = useTranslation();

    // Detect OS color scheme
    const [isDarkMode, setIsDarkMode] = useState(
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const windowLabel = getCurrentWindow().label;
    
    // Load fonts dynamically based on locale
    useEffect(() => {
        const loadFontsForLocale = async () => {
            if (i18n.language === 'ja-JP') {
                try {
                    await import('@fontsource/noto-sans-jp/300.css');
                    await import('@fontsource/noto-sans-jp/400.css');
                    await import('@fontsource/noto-sans-jp/500.css');
                    await import('@fontsource/noto-sans-jp/700.css');
                } catch (error) {
                    console.error('Failed to load Japanese fonts:', error);
                }
            }
        };
        
        loadFontsForLocale();
    }, [i18n.language]);
    
    useEffect(() => {
        // only start listening on component mount
        const unlistenPromise = listen('assistant-config-updated', async () => {
            // force sub-windows to get recent config to update the appearance
            if (isSubWindow) {
                console.log(`Fetching latest config for subwindow: ${windowLabel}`);
                await useDataStore.getState().getDBConfig(); 
            }
        });
        return () => {
            unlistenPromise.then(unlistenFn => unlistenFn()); // make sure to unlisten on umount
        };
    }, []);
    // Dynamic font family based on locale
    const getFontFamily = (locale) => {
        switch (locale) {
            case 'ja-JP':
                return ['"Noto Sans JP"', '"Hiragino Kaku Gothic Pro"', '"ヒラギノ角ゴ Pro W3"', '"メイリオ"', '"Meiryo"', 'sans-serif'].join(',');
            case 'zh-Hans':
            case 'zh-Hant':
                return ['"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"微软雅黑"', 'sans-serif'].join(',');
            default:
                return ["IntelOneDisplay", "Roboto", "Helvetica", "Arial", "sans-serif"].join(',');
        }
    };

    const globalTheme = createTheme({
        typography: {
            fontFamily: getFontFamily(i18n.language),
        },
        palette: {
            mode: isDarkMode ? "dark" : "light",
            primary: {
                main: assistant.header_bg_color,
                contrastText: assistant.header_text_bg_color,
            },
            secondary: {
                main: assistant.sidebar_box_bg_color,
            },
        },
        components: {
            MuiLink: {
                // color: "rgb(65, 148, 204)", 
            },
        },
    });

    return (
        <span
            // global variables for non-mui components to access global theme colors from
            style={{
                "--primary-main-color": globalTheme.palette.primary.main,
                "--primary-light-color": globalTheme.palette.primary.light,
                "--primary-dark-color": globalTheme.palette.primary.dark,
                "--primary-text-color": globalTheme.palette.primary.contrastText,
                "--secondary-main-color": globalTheme.palette.secondary.main,
                "--secondary-light-color": globalTheme.palette.secondary.light,
                "--secondary-dark-color": globalTheme.palette.secondary.dark,
                "--secondary-text-color": globalTheme.palette.secondary.contrastText,     
                "--error-main-color": globalTheme.palette.error.main,
                "--bg-color": globalTheme.palette.background.default,
                "--divider-color": globalTheme.palette.divider,
                "--text-primary-color": globalTheme.palette.text.primary,
                "--text-secondary-color": globalTheme.palette.text.secondary,
                "--button-active-color": globalTheme.palette.action.active,
                "--button-hover-color": globalTheme.palette.action.hover,
                "--button-selected-color": globalTheme.palette.action.selected,
                "--button-disabled-color": globalTheme.palette.action.disabled,
                "--locale-font-family": getFontFamily(i18n.language),
            }}
        >
            <ThemeProvider theme={globalTheme}>
                {children}
            </ThemeProvider>
        </span>
        
    );
};

export default GlobalThemeProvider;