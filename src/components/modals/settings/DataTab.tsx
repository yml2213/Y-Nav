import React, { useState, useEffect, useCallback } from 'react';
import { Database, Upload, Cloud, Lock, Eye, EyeOff, RefreshCw, Clock, Cpu, CloudUpload, CloudDownload, Trash2 } from 'lucide-react';
import { SyncStatus } from '../../../types';
import { SYNC_API_ENDPOINT, SYNC_META_KEY, SYNC_PASSWORD_KEY, SYNC_API_VERSION, SYNC_DATA_SCHEMA_VERSION } from '../../../utils/constants';

interface DataTabProps {
    onOpenImport: () => void;
    onClose: () => void;
    onCreateBackup: () => Promise<boolean>;
    onRestoreBackup: (backupKey: string) => Promise<boolean>;
    onDeleteBackup: (backupKey: string) => Promise<boolean>;
    onSyncPasswordChange: (password: string) => void;
    useSeparatePrivacyPassword: boolean;
    onMigratePrivacyMode: (payload: { useSeparatePassword: boolean; oldPassword: string; newPassword: string }) => Promise<boolean>;
    privacyGroupEnabled: boolean;
    onTogglePrivacyGroup: (enabled: boolean) => void;
    privacyAutoUnlockEnabled: boolean;
    onTogglePrivacyAutoUnlock: (enabled: boolean) => void;
    syncStatus?: SyncStatus;
    lastSyncTime?: number | null;
}

interface BackupItem {
    key: string;
    timestamp?: string;
    expiration?: number;
    deviceId?: string;
    updatedAt?: number;
    version?: number;
    browser?: string;
    os?: string;
    apiVersion?: string;
    schemaVersion?: number;
}

const DataTab: React.FC<DataTabProps> = ({
    onOpenImport,
    onClose,
    onCreateBackup,
    onRestoreBackup,
    onDeleteBackup,
    onSyncPasswordChange,
    useSeparatePrivacyPassword,
    onMigratePrivacyMode,
    privacyGroupEnabled,
    onTogglePrivacyGroup,
    privacyAutoUnlockEnabled,
    onTogglePrivacyAutoUnlock,
    syncStatus = 'idle',
    lastSyncTime = null
}) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [backupError, setBackupError] = useState<string | null>(null);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [restoringKey, setRestoringKey] = useState<string | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [localMeta, setLocalMeta] = useState<any | null>(null);
    const [remoteInfo, setRemoteInfo] = useState<{ apiVersion?: string; schemaVersion?: number; meta?: any } | null>(null);
    const [remoteError, setRemoteError] = useState<string | null>(null);
    const [isLoadingRemote, setIsLoadingRemote] = useState(false);
    const [privacyTarget, setPrivacyTarget] = useState<'sync' | 'separate' | null>(null);
    const [privacyOldPassword, setPrivacyOldPassword] = useState('');
    const [privacyNewPassword, setPrivacyNewPassword] = useState('');
    const [showPrivacyOldPassword, setShowPrivacyOldPassword] = useState(false);
    const [showPrivacyNewPassword, setShowPrivacyNewPassword] = useState(false);
    const [privacyError, setPrivacyError] = useState<string | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);

    useEffect(() => {
        setPassword(localStorage.getItem(SYNC_PASSWORD_KEY) || '');
    }, []);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SYNC_META_KEY);
            setLocalMeta(stored ? JSON.parse(stored) : null);
        } catch {
            setLocalMeta(null);
        }
    }, [syncStatus, lastSyncTime]);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPassword(newVal);
        localStorage.setItem(SYNC_PASSWORD_KEY, newVal);
        onSyncPasswordChange(newVal);
    };

    const getAuthHeaders = useCallback(() => {
        const storedPassword = localStorage.getItem(SYNC_PASSWORD_KEY);
        return {
            'Content-Type': 'application/json',
            ...(storedPassword ? { 'X-Sync-Password': storedPassword } : {})
        };
    }, []);

    const formatBackupTime = (backup: BackupItem) => {
        if (backup.updatedAt) {
            return new Date(backup.updatedAt).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        if (backup.timestamp) {
            return backup.timestamp.replace('T', ' ');
        }
        return '未知时间';
    };

    const formatDeviceLabel = (deviceId?: string, browser?: string, os?: string) => {
        // 如果有浏览器和操作系统信息,优先显示
        if (browser && os) {
            return `${browser} • ${os}`;
        }

        // 否则使用原有的设备ID格式化逻辑
        if (!deviceId) return '未知设备';
        const parts = deviceId.split('_');
        if (parts.length >= 3 && parts[0] === 'device') {
            const timestamp = Number(parts[1]);
            if (!Number.isNaN(timestamp)) {
                return `设备 ${new Date(timestamp).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            }
        }
        return deviceId;
    };

    const formatSyncTime = (ts?: number | null) => {
        if (!ts) return '未同步';
        return new Date(ts).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getStatusLabel = (status: SyncStatus) => {
        if (status === 'synced') return { text: '已同步', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
        if (status === 'syncing') return { text: '同步中', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
        if (status === 'pending') return { text: '待同步', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
        if (status === 'conflict') return { text: '冲突', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
        if (status === 'error') return { text: '错误', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
        return { text: '空闲', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    };

    const fetchRemoteInfo = useCallback(async () => {
        setIsLoadingRemote(true);
        setRemoteError(null);
        try {
            const response = await fetch(SYNC_API_ENDPOINT, { headers: getAuthHeaders() });
            const result = await response.json();
            if (!result.success) {
                setRemoteInfo(null);
                setRemoteError(result.error || '获取云端状态失败');
                return;
            }
            const data = result.data || null;
            setRemoteInfo({
                apiVersion: result.apiVersion,
                schemaVersion: data?.schemaVersion,
                meta: data?.meta
            });
        } catch (error: any) {
            setRemoteInfo(null);
            setRemoteError(error.message || '网络错误');
        } finally {
            setIsLoadingRemote(false);
        }
    }, [getAuthHeaders]);

    const fetchBackups = useCallback(async () => {
        setIsLoadingBackups(true);
        setBackupError(null);
        try {
            const response = await fetch(`${SYNC_API_ENDPOINT}?action=backups`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (!result.success) {
                setBackupError(result.error || '获取备份列表失败');
                setBackups([]);
                return;
            }
            setBackups(Array.isArray(result.backups) ? result.backups : []);
        } catch (error: any) {
            setBackupError(error.message || '网络错误');
        } finally {
            setIsLoadingBackups(false);
        }
    }, [getAuthHeaders]);

    const handleCreateBackup = useCallback(async () => {
        setIsCreatingBackup(true);
        setCreateError(null);
        try {
            const success = await onCreateBackup();
            if (!success) {
                setCreateError('备份失败，请稍后重试');
                return;
            }
            await fetchBackups();
        } finally {
            setIsCreatingBackup(false);
        }
    }, [fetchBackups, onCreateBackup]);

    const handleRestoreBackup = useCallback(async (backupKey: string) => {
        setRestoringKey(backupKey);
        try {
            const success = await onRestoreBackup(backupKey);
            if (success) {
                await fetchBackups();
            }
        } finally {
            setRestoringKey(null);
        }
    }, [fetchBackups, onRestoreBackup]);

    const handleDeleteBackup = useCallback(async (backupKey: string) => {
        setDeletingKey(backupKey);
        try {
            const success = await onDeleteBackup(backupKey);
            if (success) {
                await fetchBackups();
            }
        } finally {
            setDeletingKey(null);
        }
    }, [fetchBackups, onDeleteBackup]);

    const isSyncPasswordReady = password.trim().length > 0;
    const currentPrivacyMode = useSeparatePrivacyPassword ? '独立密码' : '同步密码';

    const resetPrivacyMigration = useCallback(() => {
        setPrivacyTarget(null);
        setPrivacyOldPassword('');
        setPrivacyNewPassword('');
        setPrivacyError(null);
        setShowPrivacyOldPassword(false);
        setShowPrivacyNewPassword(false);
    }, []);

    const handleStartPrivacyMigration = (target: 'sync' | 'separate') => {
        setPrivacyTarget(target);
        setPrivacyOldPassword('');
        setPrivacyNewPassword('');
        setPrivacyError(null);
    };

    const handleConfirmPrivacyMigration = useCallback(async () => {
        if (!privacyTarget) return;
        setIsMigrating(true);
        setPrivacyError(null);
        try {
            const success = await onMigratePrivacyMode({
                useSeparatePassword: privacyTarget === 'separate',
                oldPassword: privacyOldPassword,
                newPassword: privacyNewPassword
            });
            if (!success) {
                setPrivacyError('迁移失败，请检查密码后重试');
                return;
            }
            resetPrivacyMigration();
        } finally {
            setIsMigrating(false);
        }
    }, [privacyTarget, privacyOldPassword, privacyNewPassword, onMigratePrivacyMode, resetPrivacyMigration]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    useEffect(() => {
        fetchRemoteInfo();
    }, [fetchRemoteInfo]);

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

                {/* Sync Status */}
                <div className="mb-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <Cloud size={14} className="text-slate-500" />
                            同步状态
                        </div>
                        <button
                            type="button"
                            onClick={fetchRemoteInfo}
                            disabled={isLoadingRemote}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent transition-colors disabled:opacity-60"
                        >
                            <RefreshCw size={12} className={isLoadingRemote ? 'animate-spin' : ''} />
                            刷新
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-slate-600 dark:text-slate-400">本地</div>
                                {(() => {
                                    const badge = getStatusLabel(syncStatus);
                                    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.text}</span>;
                                })()}
                            </div>
                            <div className="mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                                <div>最后同步：{formatSyncTime(lastSyncTime)}</div>
                                <div>Revision：{typeof localMeta?.version === 'number' ? localMeta.version : '-'}</div>
                                <div>更新时间：{formatSyncTime(localMeta?.updatedAt)}</div>
                                <div>设备：{formatDeviceLabel(localMeta?.deviceId, localMeta?.browser, localMeta?.os)}</div>
                                <div>API：{SYNC_API_VERSION} / Schema：v{SYNC_DATA_SCHEMA_VERSION}</div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-slate-600 dark:text-slate-400">云端</div>
                                <span className="text-[10px] text-slate-400">
                                    {remoteInfo?.apiVersion ? `API ${remoteInfo.apiVersion}` : ''}
                                </span>
                            </div>
                            <div className="mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                                {remoteError ? (
                                    <div className="text-red-600 dark:text-red-400 break-all">{remoteError}</div>
                                ) : (
                                    <>
                                        <div>Revision：{typeof remoteInfo?.meta?.version === 'number' ? remoteInfo.meta.version : '-'}</div>
                                        <div>更新时间：{formatSyncTime(remoteInfo?.meta?.updatedAt)}</div>
                                        <div>设备：{formatDeviceLabel(remoteInfo?.meta?.deviceId, remoteInfo?.meta?.browser, remoteInfo?.meta?.os)}</div>
                                        <div>Schema：{typeof remoteInfo?.schemaVersion === 'number' ? `v${remoteInfo.schemaVersion}` : '-'}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Vault */}
                <div className="mb-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <Lock size={14} className="text-slate-500" />
                        隐私分组
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-300">启用隐私分组</span>
                        <button
                            type="button"
                            onClick={() => onTogglePrivacyGroup(!privacyGroupEnabled)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${privacyGroupEnabled ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
                            aria-pressed={privacyGroupEnabled}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${privacyGroupEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                    {!privacyGroupEnabled && (
                        <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            已关闭后侧边栏不显示隐私分组
                        </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-300">自动解锁</span>
                        <button
                            type="button"
                            onClick={() => onTogglePrivacyAutoUnlock(!privacyAutoUnlockEnabled)}
                            disabled={!privacyGroupEnabled}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${privacyAutoUnlockEnabled ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'} ${!privacyGroupEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-pressed={privacyAutoUnlockEnabled}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${privacyAutoUnlockEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                    {privacyAutoUnlockEnabled && (
                        <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            仅当前标签页有效，关闭标签页后自动加锁
                        </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        当前模式：{currentPrivacyMode}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => handleStartPrivacyMigration('separate')}
                            disabled={useSeparatePrivacyPassword || !isSyncPasswordReady}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-accent/50 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            切换为独立密码
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStartPrivacyMigration('sync')}
                            disabled={!useSeparatePrivacyPassword}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-accent/50 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            切换为同步密码
                        </button>
                    </div>

                    {!isSyncPasswordReady && !useSeparatePrivacyPassword && (
                        <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                            启用独立密码前请先设置同步密码。
                        </div>
                    )}

                    {privacyTarget && (
                        <div className="mt-4 space-y-3">
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                                请输入旧密码与新密码后完成迁移。
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    旧密码
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPrivacyOldPassword ? 'text' : 'password'}
                                        value={privacyOldPassword}
                                        onChange={(e) => setPrivacyOldPassword(e.target.value)}
                                        placeholder="请输入旧密码"
                                        className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivacyOldPassword(prev => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        {showPrivacyOldPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    新密码
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPrivacyNewPassword ? 'text' : 'password'}
                                        value={privacyNewPassword}
                                        onChange={(e) => setPrivacyNewPassword(e.target.value)}
                                        placeholder={privacyTarget === 'sync' ? '必须与同步密码一致' : '请输入新独立密码'}
                                        className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivacyNewPassword(prev => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        {showPrivacyNewPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                </div>
                            </div>

                            {privacyError && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                    {privacyError}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleConfirmPrivacyMigration}
                                    disabled={isMigrating || (privacyTarget === 'separate' && !isSyncPasswordReady)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isMigrating ? '迁移中...' : '确认迁移'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetPrivacyMigration}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Backup List */}
                <div className="mb-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">云端备份列表</div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCreateBackup}
                                disabled={isCreatingBackup}
                                className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 disabled:opacity-60"
                            >
                                <CloudUpload size={12} className={isCreatingBackup ? 'animate-spin' : ''} />
                                创建备份
                            </button>
                            <button
                                type="button"
                                onClick={fetchBackups}
                                disabled={isLoadingBackups}
                                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-60"
                            >
                                <RefreshCw size={12} className={isLoadingBackups ? 'animate-spin' : ''} />
                                刷新
                            </button>
                        </div>
                    </div>

                    {createError && (
                        <div className="mb-2 text-xs text-red-600 dark:text-red-400">{createError}</div>
                    )}

                    {isLoadingBackups && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">加载中...</div>
                    )}

                    {!isLoadingBackups && backupError && (
                        <div className="text-xs text-red-600 dark:text-red-400">{backupError}</div>
                    )}

                    {!isLoadingBackups && !backupError && backups.length === 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">暂无备份</div>
                    )}

                    {!isLoadingBackups && !backupError && backups.length > 0 && (
                        <div className="space-y-2">
                            {backups.map((backup) => {
                                const deviceLabel = formatDeviceLabel(backup.deviceId, backup.browser, backup.os);
                                const showDeviceId = backup.deviceId && !backup.browser && !backup.os && deviceLabel !== backup.deviceId;
                                return (
                                <div
                                    key={backup.key}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <Clock size={12} />
                                            <span>{formatBackupTime(backup)}</span>
                                            {typeof backup.version === 'number' && (
                                                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-[10px] text-slate-600 dark:text-slate-300">
                                                    rev {backup.version}
                                                </span>
                                            )}
                                            {backup.apiVersion && (
                                                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-[10px] text-slate-600 dark:text-slate-300">
                                                    {backup.apiVersion}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRestoreBackup(backup.key)}
                                                disabled={!!restoringKey || !!deletingKey}
                                                className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 disabled:opacity-60"
                                            >
                                                <CloudDownload size={12} className={restoringKey === backup.key ? 'animate-spin' : ''} />
                                                恢复
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBackup(backup.key)}
                                                disabled={!!restoringKey || !!deletingKey}
                                                className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 disabled:opacity-60"
                                            >
                                                <Trash2 size={12} className={deletingKey === backup.key ? 'animate-spin' : ''} />
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Cpu size={12} />
                                        <span className="break-all">{deviceLabel}</span>
                                    </div>
                                    {showDeviceId && (
                                        <div className="mt-1 pl-5 text-[10px] text-slate-500 dark:text-slate-400 break-all">
                                            {backup.deviceId}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
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
