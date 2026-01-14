/**
 * Cloudflare Pages Function: KV 同步 API
 * 
 * 端点:
 *   GET  /api/sync         - 读取云端数据
 *   POST /api/sync         - 写入云端数据 (带版本校验)
 *   POST /api/sync/backup  - 创建带时间戳的快照备份
 *   GET  /api/sync/backups - 获取备份列表
 */

// Cloudflare KV 类型定义 (内联，避免需要安装 @cloudflare/workers-types)
interface KVNamespaceInterface {
    get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
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
}

interface YNavSyncData {
    links: any[];
    categories: any[];
    searchConfig?: any;
    aiConfig?: any;
    siteSettings?: any;
    meta: SyncMetadata;
}

// KV Key 常量
const KV_MAIN_DATA_KEY = 'ynav:data';
const KV_BACKUP_PREFIX = 'ynav:backup:';

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
        const data = await env.YNAV_KV.get(KV_MAIN_DATA_KEY, 'json');

        if (!data) {
            return new Response(JSON.stringify({
                success: true,
                data: null,
                message: '云端暂无数据'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
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
        const existingData = await env.YNAV_KV.get(KV_MAIN_DATA_KEY, 'json') as YNavSyncData | null;

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
            expirationTtl: 30 * 24 * 60 * 60
        });

        return new Response(JSON.stringify({
            success: true,
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
        const list = await env.YNAV_KV.list({ prefix: KV_BACKUP_PREFIX });

        const backups = list.keys.map((key: { name: string; expiration?: number }) => ({
            key: key.name,
            timestamp: key.name.replace(KV_BACKUP_PREFIX, ''),
            expiration: key.expiration
        }));

        return new Response(JSON.stringify({
            success: true,
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
        return handlePost(request, env);
    }

    return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
    }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
