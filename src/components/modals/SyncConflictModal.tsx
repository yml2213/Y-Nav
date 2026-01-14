/**
 * SyncConflictModal - 数据同步冲突解决对话框
 * 
 * 当检测到云端数据版本与本地不一致时弹出，让用户选择保留哪个版本
 */

import React from 'react';
import { X, CloudOff, Smartphone, AlertTriangle, Clock, Link2, FolderOpen } from 'lucide-react';
import { SyncConflict } from '../../types';

interface SyncConflictModalProps {
    isOpen: boolean;
    conflict: SyncConflict | null;
    onResolve: (choice: 'local' | 'remote') => void;
    onClose: () => void;
    closeOnBackdrop?: boolean;
}

const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
    isOpen,
    conflict,
    onResolve,
    onClose,
    closeOnBackdrop = true
}) => {
    if (!isOpen || !conflict) return null;

    const localTime = new Date(conflict.localData.meta.updatedAt);
    const remoteTime = new Date(conflict.remoteData.meta.updatedAt);

    const formatTime = (date: Date) => {
        return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isLocalNewer = conflict.localData.meta.updatedAt > conflict.remoteData.meta.updatedAt;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-5 border-b border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            检测到数据冲突
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            云端数据已被其他设备更新，请选择要保留的版本
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content: Two columns comparison */}
                <div className="p-5 grid grid-cols-2 gap-4">
                    {/* Local Version */}
                    <div
                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg group ${isLocalNewer
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-600 hover:border-blue-400'
                            }`}
                        onClick={() => onResolve('local')}
                    >
                        {isLocalNewer && (
                            <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                                较新
                            </span>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-slate-900 dark:text-white">本地版本</span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(localTime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                <span>{conflict.localData.links.length} 个链接</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                <span>{conflict.localData.categories.length} 个分类</span>
                            </div>
                        </div>

                        <button
                            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors group-hover:ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-800"
                            onClick={(e) => {
                                e.stopPropagation();
                                onResolve('local');
                            }}
                        >
                            使用本地版本
                        </button>
                    </div>

                    {/* Remote Version */}
                    <div
                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg group ${!isLocalNewer
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-slate-200 dark:border-slate-600 hover:border-purple-400'
                            }`}
                        onClick={() => onResolve('remote')}
                    >
                        {!isLocalNewer && (
                            <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                                较新
                            </span>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                            <CloudOff className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span className="font-medium text-slate-900 dark:text-white">云端版本</span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(remoteTime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                <span>{conflict.remoteData.links.length} 个链接</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                <span>{conflict.remoteData.categories.length} 个分类</span>
                            </div>
                        </div>

                        <button
                            className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors group-hover:ring-2 ring-purple-400 ring-offset-2 dark:ring-offset-slate-800"
                            onClick={(e) => {
                                e.stopPropagation();
                                onResolve('remote');
                            }}
                        >
                            使用云端版本
                        </button>
                    </div>
                </div>

                {/* Footer hint */}
                <div className="px-5 pb-5">
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                        <strong>提示：</strong>选择后，另一个版本将被覆盖。如需保留两者，请先导出本地数据后再选择云端版本。
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyncConflictModal;
