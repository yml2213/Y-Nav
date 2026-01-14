import React, { useRef, useState, useEffect } from 'react';
import { Globe, Upload, RefreshCw } from 'lucide-react';
import { SiteSettings } from '../../../types';

interface SiteTabProps {
    settings: SiteSettings;
    onChange: (key: keyof SiteSettings, value: any) => void;
}

const getRandomColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = 70 + Math.random() * 20;
    const l = 45 + Math.random() * 15;
    return `hsl(${h}, ${s}%, ${l}%)`;
};

const generateSvgIcon = (text: string, color1: string, color2: string) => {
    let char = '';
    // Use first character of title, default to 'Y' if empty
    if (text && text.length > 0) {
        char = text.substring(0, 1).toUpperCase();
    } else {
        char = 'Y';
    }

    const gradientId = 'g_' + Math.random().toString(36).substr(2, 9);

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
            <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${color1}"/>
                <stop offset="100%" stop-color="${color2}"/>
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#${gradientId})" rx="16"/>
        <text x="50%" y="54%" dy=".1em" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="36" text-anchor="middle">${char}</text>
    </svg>`.trim();

    try {
        const encoded = window.btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${encoded}`;
    } catch (e) {
        console.error("SVG Icon Generation Failed", e);
        return '';
    }
};

const SiteTab: React.FC<SiteTabProps> = ({ settings, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [generatedIcons, setGeneratedIcons] = useState<string[]>([]);
    const closeOnBackdrop = !!settings.closeOnBackdrop;

    const updateGeneratedIcons = (text: string) => {
        const newIcons: string[] = [];
        for (let i = 0; i < 6; i++) {
            const c1 = getRandomColor();
            const h2 = (parseInt(c1.split(',')[0].split('(')[1]) + 30 + Math.random() * 30) % 360;
            const c2 = `hsl(${h2}, 70%, 50%)`;
            newIcons.push(generateSvgIcon(text, c1, c2));
        }
        setGeneratedIcons(newIcons);
    };

    // Initial generation
    useEffect(() => {
        if (generatedIcons.length === 0) {
            updateGeneratedIcons(settings.title || 'Y-Nav');
        }
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('图标文件大小不能超过 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target?.result as string;
            onChange('favicon', base64String);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">网页标题</label>
                    <input
                        type="text"
                        value={settings.title}
                        onChange={(e) => {
                            onChange('title', e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">网站图标</label>
                    <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-2 group relative">
                            {settings.favicon ? (
                                <img src={settings.favicon} className="w-full h-full object-contain" alt="Favicon" />
                            ) : (
                                <Globe size={24} className="text-slate-300" />
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <Upload size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.favicon}
                                    onChange={(e) => onChange('favicon', e.target.value)}
                                    placeholder="https://example.com/favicon.ico"
                                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
                                >
                                    上传
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.svg,.ico,image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">随机生成图标</span>
                                    <button
                                        type="button"
                                        onClick={() => updateGeneratedIcons(settings.title)}
                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[10px] font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                        <RefreshCw size={10} /> 换一批
                                    </button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {generatedIcons.map((icon, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onChange('favicon', icon)}
                                            className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all bg-white dark:bg-slate-800"
                                        >
                                            <img src={icon} className="w-full h-full object-cover" alt="Generated" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">弹窗交互</label>
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">点击遮罩关闭弹窗</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">关闭可避免误触</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange('closeOnBackdrop', !closeOnBackdrop)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${closeOnBackdrop
                            ? 'bg-accent'
                            : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        aria-pressed={closeOnBackdrop}
                        aria-label="点击遮罩关闭弹窗"
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${closeOnBackdrop
                                ? 'translate-x-5'
                                : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SiteTab;
