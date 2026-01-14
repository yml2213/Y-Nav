import React, { useState, useEffect } from 'react';
import { X, Save, Bot, Globe, Palette, Database } from 'lucide-react';
import { AIConfig, LinkItem, SiteSettings } from '../../types';
import SiteTab from './settings/SiteTab';
import AITab from './settings/AITab';
import AppearanceTab from './settings/AppearanceTab';
import DataTab from './settings/DataTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIConfig;
  siteSettings: SiteSettings;
  onSave: (config: AIConfig, siteSettings: SiteSettings) => void;
  links: LinkItem[];
  onUpdateLinks: (links: LinkItem[]) => void;
  onOpenImport: () => void;
  closeOnBackdrop?: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  siteSettings,
  onSave,
  links,
  onUpdateLinks,
  onOpenImport,
  closeOnBackdrop = true
}) => {
  const [activeTab, setActiveTab] = useState<'site' | 'ai' | 'appearance' | 'data'>('site');
  const [localConfig, setLocalConfig] = useState<AIConfig>(config);
  const [localSiteSettings, setLocalSiteSettings] = useState<SiteSettings>(() => ({
    title: siteSettings?.title || '元启 - AI 智能导航',
    favicon: siteSettings?.favicon || '',
    cardStyle: siteSettings?.cardStyle || 'detailed',
    accentColor: siteSettings?.accentColor || '99 102 241',
    grayScale: siteSettings?.grayScale || 'slate',
    closeOnBackdrop: siteSettings?.closeOnBackdrop ?? false
  }));

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setLocalSiteSettings({
        title: siteSettings?.title || '元启 - AI 智能导航',
        favicon: siteSettings?.favicon || '',
        cardStyle: siteSettings?.cardStyle || 'detailed',
        accentColor: siteSettings?.accentColor || '99 102 241',
        grayScale: siteSettings?.grayScale || 'slate',
        closeOnBackdrop: siteSettings?.closeOnBackdrop ?? false
      });
      setActiveTab('site');
    }
  }, [isOpen, config, siteSettings]);

  const handleChange = (key: keyof AIConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSiteChange = (key: keyof SiteSettings, value: any) => {
    setLocalSiteSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localConfig, localSiteSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-transform duration-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            设置
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs - Centered Segmented Control */}
        <div className="px-6 pt-6 shrink-0">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('site')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'site'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Globe size={16} />
              <span>网站设置</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'ai'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Bot size={16} />
              <span>AI 助手</span>
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'appearance'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Palette size={16} />
              <span>外观</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'data'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Database size={16} />
              <span>数据</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {activeTab === 'site' && (
            <SiteTab settings={localSiteSettings} onChange={handleSiteChange} />
          )}

          {activeTab === 'ai' && (
            <AITab
              config={localConfig}
              onChange={handleChange}
              links={links}
              onUpdateLinks={onUpdateLinks}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceTab settings={localSiteSettings} onChange={handleSiteChange} />
          )}

          {activeTab === 'data' && (
            <DataTab
              onOpenImport={onOpenImport}
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 border-t border-transparent shrink-0">
          <button
            onClick={handleSave}
            className="w-full bg-slate-900 dark:bg-accent text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-accent/90 transition-all shadow-lg shadow-slate-200 dark:shadow-none active:scale-[0.99] text-sm flex items-center justify-center gap-2"
          >
            <Save size={16} />
            <span>保存设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
