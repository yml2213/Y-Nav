/**
 * useSyncEngine - Y-Nav KV 同步引擎
 * 
 * 功能:
 *   - 页面加载时检测云端数据并处理冲突
 *   - 数据变更时 debounce 自动同步到 KV
 *   - 手动触发备份
 *   - 同步状态管理
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    YNavSyncData,
    SyncStatus,
    SyncConflict,
    SyncMetadata,
    LinkItem,
    Category,
    SearchConfig,
    AIConfig,
    SiteSettings
} from '../types';
import {
    SYNC_DEBOUNCE_MS,
    SYNC_API_ENDPOINT,
    SYNC_META_KEY,
    SYNC_PASSWORD_KEY,
    SYNC_DATA_SCHEMA_VERSION,
    getDeviceId,
    getDeviceInfo
} from '../utils/constants';

// 同步引擎配置
interface UseSyncEngineOptions {
    onConflict?: (conflict: SyncConflict) => void;
    onSyncComplete?: (data: YNavSyncData) => void;
    onError?: (error: string) => void;
}

// 同步引擎返回值
interface UseSyncEngineReturn {
    // 状态
    syncStatus: SyncStatus;
    lastSyncTime: number | null;

    // 操作
    pullFromCloud: () => Promise<YNavSyncData | null>;
    pushToCloud: (data: Omit<YNavSyncData, 'meta'>, force?: boolean) => Promise<boolean>;
    schedulePush: (data: Omit<YNavSyncData, 'meta'>) => void;
    createBackup: (data: Omit<YNavSyncData, 'meta'>) => Promise<boolean>;
    restoreBackup: (backupKey: string) => Promise<YNavSyncData | null>;
    deleteBackup: (backupKey: string) => Promise<boolean>;

    // 冲突解决
    resolveConflict: (choice: 'local' | 'remote') => void;
    currentConflict: SyncConflict | null;

    // 工具
    cancelPendingSync: () => void;
}

// 获取当前本地的 sync meta
const getLocalSyncMeta = (): SyncMetadata | null => {
    try {
        const stored = localStorage.getItem(SYNC_META_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

// 保存 sync meta 到本地
const saveLocalSyncMeta = (meta: SyncMetadata): void => {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
};

const getAuthHeaders = (): HeadersInit => {
    const password = localStorage.getItem(SYNC_PASSWORD_KEY);
    return {
        'Content-Type': 'application/json',
        ...(password ? { 'X-Sync-Password': password } : {})
    };
};

export function useSyncEngine(options: UseSyncEngineOptions = {}): UseSyncEngineReturn {
    const { onConflict, onSyncComplete, onError } = options;

    // 状态
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);

    // Refs for debounce
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const pendingData = useRef<Omit<YNavSyncData, 'meta'> | null>(null);

    // 从云端拉取数据
    const pullFromCloud = useCallback(async (): Promise<YNavSyncData | null> => {
        setSyncStatus('syncing');

        try {
            const response = await fetch(SYNC_API_ENDPOINT, {
                headers: getAuthHeaders()
            });
            const result = await response.json();

            if (!result.success) {
                setSyncStatus('error');
                onError?.(result.error || '拉取失败');
                return null;
            }

            if (!result.data) {
                // 云端无数据
                setSyncStatus('idle');
                return null;
            }

            setSyncStatus('synced');
            setLastSyncTime(result.data.meta.updatedAt);

            // 保存云端的 meta 到本地
            saveLocalSyncMeta(result.data.meta);

            return result.data;
        } catch (error: any) {
            setSyncStatus('error');
            onError?.(error.message || '网络错误');
            return null;
        }
    }, [onError]);

    // 推送数据到云端
    const pushToCloud = useCallback(async (
        data: Omit<YNavSyncData, 'meta'>,
        force: boolean = false
    ): Promise<boolean> => {
        setSyncStatus('syncing');

        const localMeta = getLocalSyncMeta();
        const deviceId = getDeviceId();
        const deviceInfo = getDeviceInfo();

        // 构建完整的同步数据
        const syncData: YNavSyncData = {
            ...data,
            meta: {
                updatedAt: Date.now(),
                deviceId,
                version: localMeta?.version || 0,
                browser: deviceInfo?.browser,
                os: deviceInfo?.os
            }
        };

        try {
            const response = await fetch(SYNC_API_ENDPOINT, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    data: syncData,
                    expectedVersion: force ? undefined : localMeta?.version
                })
            });

            const result = await response.json();

            // 处理冲突
            if (result.conflict && result.data) {
                setSyncStatus('conflict');
                const conflict: SyncConflict = {
                    localData: syncData,
                    remoteData: result.data
                };
                setCurrentConflict(conflict);
                onConflict?.(conflict);
                return false;
            }

            if (!result.success) {
                setSyncStatus('error');
                onError?.(result.error || '推送失败');
                return false;
            }

            // 成功，更新本地 meta
            if (result.data?.meta) {
                saveLocalSyncMeta(result.data.meta);
                setLastSyncTime(result.data.meta.updatedAt);
            }

            setSyncStatus('synced');
            onSyncComplete?.(result.data);
            return true;
        } catch (error: any) {
            setSyncStatus('error');
            onError?.(error.message || '网络错误');
            return false;
        }
    }, [onConflict, onSyncComplete, onError]);

    // 带 debounce 的推送调度
    const schedulePush = useCallback((data: Omit<YNavSyncData, 'meta'>) => {
        // 存储待推送数据
        pendingData.current = data;
        setSyncStatus('pending');

        // 清除之前的定时器
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // 设置新的定时器
        debounceTimer.current = setTimeout(async () => {
            if (pendingData.current) {
                await pushToCloud(pendingData.current);
                pendingData.current = null;
            }
        }, SYNC_DEBOUNCE_MS);
    }, [pushToCloud]);

    // 取消待处理的同步
    const cancelPendingSync = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
        pendingData.current = null;
        setSyncStatus('idle');
    }, []);

    // 创建备份
    const createBackup = useCallback(async (
        data: Omit<YNavSyncData, 'meta'>
    ): Promise<boolean> => {
        setSyncStatus('syncing');

        const deviceId = getDeviceId();
        const deviceInfo = getDeviceInfo();
        const syncData: YNavSyncData = {
            ...data,
            meta: {
                updatedAt: Date.now(),
                deviceId,
                version: getLocalSyncMeta()?.version || 0,
                browser: deviceInfo?.browser,
                os: deviceInfo?.os
            }
        };

        try {
            const response = await fetch(`${SYNC_API_ENDPOINT}?action=backup`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ data: syncData })
            });

            const result = await response.json();

            if (!result.success) {
                setSyncStatus('error');
                onError?.(result.error || '备份失败');
                return false;
            }

            setSyncStatus('synced');
            return true;
        } catch (error: any) {
            setSyncStatus('error');
            onError?.(error.message || '网络错误');
            return false;
        }
    }, [onError]);

    // 从备份恢复（服务端会创建回滚点）
    const restoreBackup = useCallback(async (backupKey: string): Promise<YNavSyncData | null> => {
        setSyncStatus('syncing');

        try {
            const response = await fetch(`${SYNC_API_ENDPOINT}?action=restore`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ backupKey, deviceId: getDeviceId() })
            });
            const result = await response.json();

            if (!result.success || !result.data) {
                setSyncStatus('error');
                onError?.(result.error || '恢复失败');
                return null;
            }

            saveLocalSyncMeta(result.data.meta);
            setLastSyncTime(result.data.meta.updatedAt);
            setSyncStatus('synced');

            return result.data;
        } catch (error: any) {
            setSyncStatus('error');
            onError?.(error.message || '网络错误');
            return null;
        }
    }, [onError]);

    // 删除备份
    const deleteBackup = useCallback(async (backupKey: string): Promise<boolean> => {
        try {
            const response = await fetch(`${SYNC_API_ENDPOINT}?action=backup`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ backupKey })
            });
            const result = await response.json();

            if (!result.success) {
                onError?.(result.error || '删除失败');
                return false;
            }

            return true;
        } catch (error: any) {
            onError?.(error.message || '网络错误');
            return false;
        }
    }, [onError]);

    // 解决冲突
    const resolveConflict = useCallback((choice: 'local' | 'remote') => {
        if (!currentConflict) return;

        if (choice === 'local') {
            // 使用本地版本，强制推送
            pushToCloud(currentConflict.localData, true);
        } else {
            // 使用云端版本
            saveLocalSyncMeta(currentConflict.remoteData.meta);
            setLastSyncTime(currentConflict.remoteData.meta.updatedAt);
            onSyncComplete?.(currentConflict.remoteData);
            setSyncStatus('synced');
        }

        setCurrentConflict(null);
    }, [currentConflict, pushToCloud, onSyncComplete]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    return {
        syncStatus,
        lastSyncTime,
        pullFromCloud,
        pushToCloud,
        schedulePush,
        createBackup,
        restoreBackup,
        deleteBackup,
        resolveConflict,
        currentConflict,
        cancelPendingSync
    };
}

// 辅助函数：构建同步数据对象
export function buildSyncData(
    links: LinkItem[],
    categories: Category[],
    searchConfig?: SearchConfig,
    aiConfig?: AIConfig,
    siteSettings?: SiteSettings,
    privateVault?: string
): Omit<YNavSyncData, 'meta'> {
    return {
        links,
        categories,
        searchConfig,
        aiConfig,
        siteSettings,
        privateVault,
        schemaVersion: SYNC_DATA_SCHEMA_VERSION
    };
}
