/**
 * Cloudflare Pages Function: KV 同步 API
 * 
 * 端点:
 *   GET  /api/sync         - 读取云端数据
 *   POST /api/sync         - 写入云端数据 (带版本校验)
 *   POST /api/sync/backup  - 创建带时间戳的快照备份
 *   POST /api/sync/restore - 从备份恢复并创建回滚点
 *   GET  /api/sync/backups - 获取备份列表
 */

// Cloudflare KV 类型定义 (内联，避免需要安装 @cloudflare/workers-types)
interface KVNamespaceInterface {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string; expiration?: number }> }>;
}

interface Env {
    YNAV_KV: KVNamespaceInterface;
    SYNC_PASSWORD?: string; // 可选的同步密码
}

interface SyncMetadata {
    updatedAt: number;
    deviceId: string;
    version: number;
    browser?: string;
    os?: string;
}

interface YNavSyncData {
    links: any[];
    categories: any[];
    searchConfig?: any;
    aiConfig?: any;
    siteSettings?: any;
    privateVault?: string;
    schemaVersion?: number;
    meta: SyncMetadata;
}

// KV Key 常量
const SYNC_API_VERSION = 'v1';
const KV_MAIN_DATA_KEY = `ynav:data:${SYNC_API_VERSION}`;
const KV_BACKUP_PREFIX = `ynav:backup:${SYNC_API_VERSION}:`;
// Legacy (pre-versioned) keys for backward compatibility
const KV_LEGACY_MAIN_DATA_KEY = 'ynav:data';
const KV_LEGACY_BACKUP_PREFIX = 'ynav:backup:';
const BACKUP_TTL_SECONDS = 30 * 24 * 60 * 60;

const isBackupKeyValid = (backupKey: string) => (
    backupKey.startsWith(KV_BACKUP_PREFIX) || backupKey.startsWith(KV_LEGACY_BACKUP_PREFIX)
);

const getBackupTimestamp = (backupKey: string) => {
    if (backupKey.startsWith(KV_BACKUP_PREFIX)) return backupKey.replace(KV_BACKUP_PREFIX, '');
    if (backupKey.startsWith(KV_LEGACY_BACKUP_PREFIX)) return backupKey.replace(KV_LEGACY_BACKUP_PREFIX, '');
    return backupKey;
};

const getBackupApiVersion = (backupKey: string) => (
    backupKey.startsWith(KV_BACKUP_PREFIX) ? SYNC_API_VERSION : 'legacy'
);

const loadCurrentData = async (env: Env): Promise<YNavSyncData | null> => {
    const v1 = await env.YNAV_KV.get(KV_MAIN_DATA_KEY, 'json') as YNavSyncData | null;
    if (v1) return v1;
    const legacy = await env.YNAV_KV.get(KV_LEGACY_MAIN_DATA_KEY, 'json') as YNavSyncData | null;
    return legacy;
};

// 辅助函数：验证密码
const isAuthenticated = (request: Request, env: Env): boolean => {
    // 如果服务端未设置密码，则默认允许访问（为了兼容性和简易部署）
    if (!env.SYNC_PASSWORD || env.SYNC_PASSWORD.trim() === '') {
        return true;
    }

    // 获取请求头中的密码
    const authHeader = request.headers.get('X-Sync-Password');

    // 简单的字符串比对
    return authHeader === env.SYNC_PASSWORD;
};

// GET /api/sync - 读取云端数据
async function handleGet(request: Request, env: Env): Promise<Response> {
    // 鉴权检查
    if (!isAuthenticated(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized: 密码错误或未配置'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const data = await loadCurrentData(env);

        if (!data) {
            return new Response(JSON.stringify({
                success: true,
                apiVersion: SYNC_API_VERSION,
                data: null,
                message: '云端暂无数据'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            apiVersion: SYNC_API_VERSION,
            data
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || '读取失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST /api/sync - 写入云端数据
async function handlePost(request: Request, env: Env): Promise<Response> {
    // 鉴权检查
    if (!isAuthenticated(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized: 密码错误或未配置'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await request.json() as {
            data: YNavSyncData;
            expectedVersion?: number;  // 用于乐观锁校验
        };

        if (!body.data) {
            return new Response(JSON.stringify({
                success: false,
                error: '缺少 data 字段'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取当前云端数据进行版本校验
        const existingData = await loadCurrentData(env);

        // 如果云端有数据且客户端提供了期望版本号，进行冲突检测
        if (existingData && body.expectedVersion !== undefined) {
            if (existingData.meta.version !== body.expectedVersion) {
                // 版本冲突，返回云端数据让客户端处理
                return new Response(JSON.stringify({
                    success: false,
                    conflict: true,
                    data: existingData,
                    error: '版本冲突，云端数据已被其他设备更新'
                }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 确保 meta 信息完整
        const newVersion = existingData ? existingData.meta.version + 1 : 1;
        const dataToSave: YNavSyncData = {
            ...body.data,
            meta: {
                ...body.data.meta,
                updatedAt: Date.now(),
                version: newVersion
            }
        };

        // 写入 KV
        await env.YNAV_KV.put(KV_MAIN_DATA_KEY, JSON.stringify(dataToSave));

        return new Response(JSON.stringify({
            success: true,
            apiVersion: SYNC_API_VERSION,
            data: dataToSave,
            message: '同步成功'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || '写入失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST /api/sync (with action=backup) - 创建快照备份
async function handleBackup(request: Request, env: Env): Promise<Response> {
    // 鉴权检查 (虽然复用了 router，但为了安全再次明确)
    if (!isAuthenticated(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await request.json() as { data: YNavSyncData };

        if (!body.data) {
            return new Response(JSON.stringify({
                success: false,
                error: '缺少 data 字段'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 生成时间戳格式的备份 key
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
        const backupKey = `${KV_BACKUP_PREFIX}${timestamp}`;

        // 写入备份
        await env.YNAV_KV.put(backupKey, JSON.stringify(body.data), {
            // 备份保留 30 天
            expirationTtl: BACKUP_TTL_SECONDS
        });

        return new Response(JSON.stringify({
            success: true,
            apiVersion: SYNC_API_VERSION,
            backupKey,
            message: `备份成功: ${backupKey}`
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || '备份失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST /api/sync (with action=restore) - 从备份恢复并创建回滚点
async function handleRestoreBackup(request: Request, env: Env): Promise<Response> {
    // 鉴权检查
    if (!isAuthenticated(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await request.json() as { backupKey?: string; deviceId?: string };
        const backupKey = body.backupKey;

        if (!backupKey || !isBackupKeyValid(backupKey)) {
            return new Response(JSON.stringify({
                success: false,
                apiVersion: SYNC_API_VERSION,
                error: '无效的备份 key'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const backupData = await env.YNAV_KV.get(backupKey, 'json') as YNavSyncData | null;
        if (!backupData) {
            return new Response(JSON.stringify({
                success: false,
                apiVersion: SYNC_API_VERSION,
                error: '备份不存在或已过期'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const existingData = await loadCurrentData(env);
        const now = Date.now();
        let rollbackKey: string | null = null;

        if (existingData) {
            const rollbackTimestamp = new Date(now).toISOString().replace(/[:.]/g, '-').split('.')[0];
            rollbackKey = `${KV_BACKUP_PREFIX}rollback-${rollbackTimestamp}`;
            const rollbackData: YNavSyncData = {
                ...existingData,
                meta: {
                    ...existingData.meta,
                    updatedAt: now,
                    deviceId: body.deviceId || existingData.meta.deviceId
                }
            };
            await env.YNAV_KV.put(rollbackKey, JSON.stringify(rollbackData), {
                expirationTtl: BACKUP_TTL_SECONDS
            });
        }

        const newVersion = (existingData?.meta?.version ?? 0) + 1;
        const restoredData: YNavSyncData = {
            ...backupData,
            meta: {
                ...(backupData.meta || {}),
                updatedAt: now,
                deviceId: body.deviceId || backupData.meta?.deviceId || 'unknown',
                version: newVersion
            }
        };

        await env.YNAV_KV.put(KV_MAIN_DATA_KEY, JSON.stringify(restoredData));

        return new Response(JSON.stringify({
            success: true,
            apiVersion: SYNC_API_VERSION,
            data: restoredData,
            rollbackKey
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || '恢复失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// GET /api/sync (with action=backups) - 获取备份列表
async function handleListBackups(request: Request, env: Env): Promise<Response> {
    // 鉴权检查
    if (!isAuthenticated(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const [v1List, legacyList] = await Promise.all([
            env.YNAV_KV.list({ prefix: KV_BACKUP_PREFIX }),
            env.YNAV_KV.list({ prefix: KV_LEGACY_BACKUP_PREFIX })
        ]);
        // KV list() prefix matching means legacy prefix also matches v1 keys; filter to avoid duplicates.
        const legacyOnlyKeys = legacyList.keys.filter(k => !k.name.startsWith(KV_BACKUP_PREFIX));
        const keys = [...v1List.keys, ...legacyOnlyKeys];

        const backups = await Promise.all(keys.map(async (key: { name: string; expiration?: number }) => {
            let meta: SyncMetadata | null = null;
            let schemaVersion: number | undefined;
            try {
                const data = await env.YNAV_KV.get(key.name, 'json') as YNavSyncData | null;
                meta = data?.meta || null;
                schemaVersion = data?.schemaVersion;
            } catch {
                meta = null;
            }

            return {
                key: key.name,
                apiVersion: getBackupApiVersion(key.name),
                timestamp: getBackupTimestamp(key.name),
                expiration: key.expiration,
                deviceId: meta?.deviceId,
                updatedAt: meta?.updatedAt,
                version: meta?.version,
                browser: meta?.browser,
                os: meta?.os,
                schemaVersion
            };
        }));

        return new Response(JSON.stringify({
            success: true,
            apiVersion: SYNC_API_VERSION,
            backups
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || '获取备份列表失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE /api/sync (with action=backup) - 删除指定备份
async function handleDeleteBackup(request: Request, env: Env): Promise<Response> {
    // 鉴权检查
    if (!isAuthenticated(request, env)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await request.json() as { backupKey?: string };
        const backupKey = body.backupKey;

        if (!backupKey || !isBackupKeyValid(backupKey)) {
            return new Response(JSON.stringify({
                success: false,
                apiVersion: SYNC_API_VERSION,
                error: '无效的备份 key'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 检查备份是否存在
        const backupData = await env.YNAV_KV.get(backupKey, 'json');
        if (!backupData) {
            return new Response(JSON.stringify({
                success: false,
                apiVersion: SYNC_API_VERSION,
                error: '备份不存在或已过期'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 删除备份
        await env.YNAV_KV.delete(backupKey);

        return new Response(JSON.stringify({
            success: true,
            apiVersion: SYNC_API_VERSION,
            message: '备份已删除'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || '删除失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 主入口 - 使用 Cloudflare Pages Function 规范
export const onRequest = async (context: { request: Request; env: Env }) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // 根据请求方法和 action 参数路由
    if (request.method === 'GET') {
        if (action === 'backups') {
            return handleListBackups(request, env);
        }
        return handleGet(request, env);
    }

    if (request.method === 'POST') {
        if (action === 'backup') {
            return handleBackup(request, env);
        }
        if (action === 'restore') {
            return handleRestoreBackup(request, env);
        }
        return handlePost(request, env);
    }

    if (request.method === 'DELETE') {
        if (action === 'backup') {
            return handleDeleteBackup(request, env);
        }
    }

    return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
    }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
