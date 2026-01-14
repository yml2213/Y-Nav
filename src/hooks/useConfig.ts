import { useState, useEffect, useCallback } from 'react';
import { AIConfig, SiteSettings } from '../types';
import { AI_CONFIG_KEY, SITE_SETTINGS_KEY } from '../utils/constants';

const DEFAULT_AI_CONFIG: AIConfig = {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-2.5-flash'
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
    title: '元启 - AI 智能导航',
    navTitle: '元启',
    favicon: '',
    cardStyle: 'detailed',
    closeOnBackdrop: false
};

export function useConfig() {
    // AI Config
    const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
        const saved = localStorage.getItem(AI_CONFIG_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { }
        }
        return DEFAULT_AI_CONFIG;
    });

    // Site Settings
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
        const saved = localStorage.getItem(SITE_SETTINGS_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { }
        }
        return DEFAULT_SITE_SETTINGS;
    });

    // Save AI config
    const saveAIConfig = useCallback((config: AIConfig, newSiteSettings?: SiteSettings) => {
        setAiConfig(config);
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));

        if (newSiteSettings) {
            setSiteSettings(newSiteSettings);
            localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(newSiteSettings));
        }
    }, []);

    // Restore AI config (from backup)
    const restoreAIConfig = useCallback((config: AIConfig) => {
        setAiConfig(config);
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    }, []);

    // Update site settings (e.g., card style)
    const updateSiteSettings = useCallback((updates: Partial<SiteSettings>) => {
        setSiteSettings(prev => {
            const newSettings = { ...prev, ...updates };
            localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);

    // Handle view mode change
    const handleViewModeChange = useCallback((cardStyle: 'detailed' | 'simple') => {
        updateSiteSettings({ cardStyle });
    }, [updateSiteSettings]);

    // Update page title and favicon when site settings change
    useEffect(() => {
        if (siteSettings.title) {
            document.title = siteSettings.title;
        }

        if (siteSettings.favicon) {
            const existingFavicons = document.querySelectorAll('link[rel="icon"]');
            existingFavicons.forEach(favicon => favicon.remove());

            const favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.href = siteSettings.favicon;
            document.head.appendChild(favicon);
        }
    }, [siteSettings.title, siteSettings.favicon]);

    // Derived values
    const navTitleText = siteSettings.navTitle || '元启';
    const navTitleShort = navTitleText.slice(0, 2);

    return {
        // AI Config
        aiConfig,
        saveAIConfig,
        restoreAIConfig,

        // Site Settings
        siteSettings,
        updateSiteSettings,
        handleViewModeChange,

        // Derived
        navTitleText,
        navTitleShort
    };
}
