export interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  categoryId: string;
  createdAt: number;
  pinned?: boolean; // New field for pinning
  pinnedOrder?: number; // Field for pinned link sorting order
  order?: number; // Field for sorting order
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
}

export interface SiteSettings {
  title: string;
  navTitle: string;
  favicon: string;
  cardStyle: 'detailed' | 'simple';
  accentColor?: string; // RGB values e.g. "99 102 241"
  grayScale?: 'slate' | 'zinc' | 'neutral'; // Background tone
  closeOnBackdrop?: boolean; // Allow closing modals by clicking the backdrop
}

export interface AppState {
  links: LinkItem[];
  categories: Category[];
  darkMode: boolean;
  settings?: SiteSettings;
}

export type AIProvider = 'gemini' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  websiteTitle?: string; // 网站标题 (浏览器标签)
  faviconUrl?: string; // 网站图标URL
  navigationName?: string;
}



// 搜索模式类型
export type SearchMode = 'internal' | 'external';

// 外部搜索源配置
export interface ExternalSearchSource {
  id: string;
  name: string;
  url: string;
  icon?: string;
  enabled: boolean;
  createdAt: number;
}

// 搜索配置
export interface SearchConfig {
  mode: SearchMode;
  externalSources: ExternalSearchSource[];
  selectedSource?: ExternalSearchSource | null; // 选中的搜索源
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'common', name: '常用推荐', icon: 'Star' },
  { id: 'dev', name: '开发工具', icon: 'Code' },
  { id: 'design', name: '设计资源', icon: 'Palette' },
  { id: 'read', name: '阅读资讯', icon: 'BookOpen' },
  { id: 'ent', name: '休闲娱乐', icon: 'Gamepad2' },
  { id: 'ai', name: '人工智能', icon: 'Bot' },
];

export const INITIAL_LINKS: LinkItem[] = [
  { id: '1', title: 'GitHub', url: 'https://github.com', categoryId: 'dev', createdAt: Date.now(), description: '代码托管平台', pinned: true, icon: 'https://www.faviconextractor.com/favicon/github.com?larger=true' },
  { id: '2', title: 'React', url: 'https://react.dev', categoryId: 'dev', createdAt: Date.now(), description: '构建Web用户界面的库', pinned: true, icon: 'https://www.faviconextractor.com/favicon/react.dev?larger=true' },
  { id: '3', title: 'Tailwind CSS', url: 'https://tailwindcss.com', categoryId: 'design', createdAt: Date.now(), description: '原子化CSS框架', pinned: true, icon: 'https://www.faviconextractor.com/favicon/tailwindcss.com?larger=true' },
  { id: '4', title: 'ChatGPT', url: 'https://chat.openai.com', categoryId: 'ai', createdAt: Date.now(), description: 'OpenAI聊天机器人', pinned: true, icon: 'https://www.faviconextractor.com/favicon/chat.openai.com?larger=true' },
  { id: '5', title: 'Gemini', url: 'https://gemini.google.com', categoryId: 'ai', createdAt: Date.now(), description: 'Google DeepMind AI', pinned: true, icon: 'https://www.faviconextractor.com/favicon/gemini.google.com?larger=true' },
  // 新增测试链接
  { id: '6', title: 'Vercel', url: 'https://vercel.com', categoryId: 'dev', createdAt: Date.now(), description: '前端部署与托管平台', icon: 'https://www.faviconextractor.com/favicon/vercel.com?larger=true' },
  { id: '7', title: 'Figma', url: 'https://figma.com', categoryId: 'design', createdAt: Date.now(), description: '在线协作界面设计工具', icon: 'https://www.faviconextractor.com/favicon/figma.com?larger=true' },
  { id: '8', title: 'Hacker News', url: 'https://news.ycombinator.com', categoryId: 'read', createdAt: Date.now(), description: '极客新闻聚合社区', icon: 'https://www.faviconextractor.com/favicon/news.ycombinator.com?larger=true' },
  { id: '9', title: 'YouTube', url: 'https://youtube.com', categoryId: 'ent', createdAt: Date.now(), description: '全球最大的视频分享网站', icon: 'https://www.faviconextractor.com/favicon/youtube.com?larger=true' },
  { id: '10', title: 'Claude', url: 'https://claude.ai', categoryId: 'ai', createdAt: Date.now(), description: 'Anthropic AI助手', icon: 'https://www.faviconextractor.com/favicon/claude.ai?larger=true' },
  { id: '11', title: 'Dribbble', url: 'https://dribbble.com', categoryId: 'design', createdAt: Date.now(), description: '设计师作品分享社区', icon: 'https://www.faviconextractor.com/favicon/dribbble.com?larger=true' },
  { id: '12', title: 'VS Code', url: 'https://code.visualstudio.com', categoryId: 'dev', createdAt: Date.now(), description: '微软开源代码编辑器', icon: 'https://www.faviconextractor.com/favicon/code.visualstudio.com?larger=true' },
  { id: '13', title: 'Midjourney', url: 'https://www.midjourney.com', categoryId: 'ai', createdAt: Date.now(), description: 'AI图像生成工具', icon: 'https://www.faviconextractor.com/favicon/midjourney.com?larger=true' },
  { id: '14', title: 'The Verge', url: 'https://www.theverge.com', categoryId: 'read', createdAt: Date.now(), description: '科技新闻与评测', icon: 'https://www.faviconextractor.com/favicon/theverge.com?larger=true' },
  { id: '15', title: 'Netflix', url: 'https://www.netflix.com', categoryId: 'ent', createdAt: Date.now(), description: '流媒体影视平台', icon: 'https://www.faviconextractor.com/favicon/netflix.com?larger=true' },
];

// ============ 同步系统类型定义 ============

// 同步元数据
export interface SyncMetadata {
  updatedAt: number;      // 最后更新时间戳 (毫秒)
  deviceId: string;       // 设备唯一标识
  version: number;        // 数据版本号（递增，防止并发冲突）
}

// Main sync data structure
export interface YNavSyncData {
  links: LinkItem[];
  categories: Category[];
  searchConfig?: SearchConfig;
  aiConfig?: AIConfig;
  siteSettings?: SiteSettings;
  meta: SyncMetadata;
}

// 同步冲突信息
export interface SyncConflict {
  localData: YNavSyncData;
  remoteData: YNavSyncData;
}

// 同步状态枚举
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error' | 'conflict';

// 同步 API 响应
export interface SyncApiResponse {
}
