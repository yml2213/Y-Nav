import React, { useState, useEffect } from 'react';
import { Database, Upload, Cloud, Lock, Eye, EyeOff } from 'lucide-react';
import { SYNC_PASSWORD_KEY } from '../../../utils/constants';

interface DataTabProps {
    onOpenImport: () => void;
    onClose: () => void;
}

const DataTab: React.FC<DataTabProps> = ({ onOpenImport, onClose }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setPassword(localStorage.getItem(SYNC_PASSWORD_KEY) || '');
    }, []);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPassword(newVal);
        localStorage.setItem(SYNC_PASSWORD_KEY, newVal);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Database size={16} className="text-slate-500" />
                    数据管理 (Data Management)
                </h4>

                {/* KV Sync Info */}
                <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <Cloud className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div className="flex-1">
                            <div className="font-medium text-green-700 dark:text-green-300">云端自动同步已启用</div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                数据变更会自动同步到 Cloudflare KV，多端实时同步
                            </div>
                        </div>
                    </div>

                    {/* API Password Input */}
                    <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800/50">
                        <label className="block text-xs font-bold text-green-800 dark:text-green-200 mb-2 flex items-center gap-1.5">
                            <Lock size={12} />
                            API 访问密码 (可选)
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={handlePasswordChange}
                                placeholder="未设置密码"
                                className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-green-600/80 dark:text-green-400/80 mt-1.5 leading-relaxed">
                            如需增强安全性，请在 Cloudflare Pages 后台设置 <code>SYNC_PASSWORD</code> 环境变量，并在此处输入相同密码。
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => {
                            onOpenImport();
                            onClose();
                        }}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-accent hover:bg-accent/5 dark:hover:bg-accent/10 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-accent group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shadow-sm">
                            <Upload size={24} />
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent">导入数据</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">支持 Chrome HTML 书签或 JSON 备份导入</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataTab;

