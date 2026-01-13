import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Pin, Wand2, Trash2, Upload } from 'lucide-react';
import { LinkItem, Category, AIConfig } from '../types';
import { generateLinkDescription, suggestCategory } from '../services/geminiService';

const FAVICON_CACHE_KEY = 'cloudnav_favicon_cache';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (link: Omit<LinkItem, 'id' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  categories: Category[];
  initialData?: LinkItem;
  aiConfig: AIConfig;
  defaultCategoryId?: string;
}

const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, onSave, onDelete, categories, initialData, aiConfig, defaultCategoryId }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'common');
  const [pinned, setPinned] = useState(false);
  const [icon, setIcon] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const [autoFetchIcon, setAutoFetchIcon] = useState(true);
  const [batchMode, setBatchMode] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当模态框关闭时，重置批量模式为默认关闭状态
  useEffect(() => {
    if (!isOpen) {
      setBatchMode(false);
      setShowSuccessMessage(false);
    }
  }, [isOpen]);

  // 成功提示1秒后自动消失
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setUrl(initialData.url);
        setDescription(initialData.description || '');
        setCategoryId(initialData.categoryId);
        setPinned(initialData.pinned || false);
        setIcon(initialData.icon || '');
      } else {
        setTitle('');
        setUrl('');
        setDescription('');
        // 如果有默认分类ID且该分类存在，则使用默认分类，否则使用第一个分类
        const defaultCategory = defaultCategoryId && categories.find(cat => cat.id === defaultCategoryId);
        setCategoryId(defaultCategory ? defaultCategoryId : (categories[0]?.id || 'common'));
        setPinned(false);
        setIcon('');
      }
    }
  }, [isOpen, initialData, categories, defaultCategoryId]);

  // 当URL变化且启用自动获取图标时，自动获取图标
  useEffect(() => {
    if (url && autoFetchIcon && !initialData) {
      const timer = setTimeout(() => {
        handleFetchIcon();
      }, 500); // 延迟500ms执行，避免频繁请求

      return () => clearTimeout(timer);
    }
  }, [url, autoFetchIcon, initialData]);

  const handleDelete = () => {
    if (!initialData) return;
    onDelete && onDelete(initialData.id);
    onClose();
  };

  const cacheCustomIcon = (url: string, iconUrl: string) => {
    try {
      let domain = url;
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        const urlObj = new URL(domain);
        domain = urlObj.hostname;
      }
      const stored = localStorage.getItem(FAVICON_CACHE_KEY);
      const cache = stored ? JSON.parse(stored) : {};
      cache[domain] = iconUrl;
      localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      // Failed to cache custom icon - silently ignore
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !url) return;

    // 确保URL有协议前缀
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    // 保存链接数据
    onSave({
      id: initialData?.id || '',
      title,
      url: finalUrl,
      icon,
      description,
      categoryId,
      pinned
    });

    // 如果有自定义图标URL，缓存到本地
    if (icon && !icon.includes('faviconextractor.com')) {
      cacheCustomIcon(finalUrl, icon);
    }

    // 批量模式下不关闭窗口，只显示成功提示
    if (batchMode) {
      setShowSuccessMessage(true);
      // 重置表单，但保留分类和批量模式设置
      setTitle('');
      setUrl('');
      setIcon('');
      setDescription('');
      setPinned(false);
      // 如果开启自动获取图标，尝试获取新图标
      if (autoFetchIcon && finalUrl) {
        handleFetchIcon();
      }
    } else {
      onClose();
    }
  };

  const handleAIAssist = async () => {
    if (!url || !title) return;
    if (!aiConfig.apiKey) {
      alert("请先点击侧边栏左下角设置图标配置 AI API Key");
      return;
    }

    setIsGenerating(true);

    // Parallel execution for speed
    try {
      const descPromise = generateLinkDescription(title, url, aiConfig);
      const catPromise = suggestCategory(title, url, categories, aiConfig);

      const [desc, cat] = await Promise.all([descPromise, catPromise]);

      if (desc) setDescription(desc);
      if (cat) setCategoryId(cat);

    } catch (e) {
      console.error("AI Assist failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchIcon = async () => {
    if (!url) return;

    setIsFetchingIcon(true);
    try {
      // 提取域名
      let domain = url;
      // 如果URL没有协议前缀，添加https://作为默认协议
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        domain = 'https://' + url;
      }

      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        const urlObj = new URL(domain);
        domain = urlObj.hostname;
      }

      // 先尝试从本地缓存获取图标
      try {
        const stored = localStorage.getItem(FAVICON_CACHE_KEY);
        const cache = stored ? JSON.parse(stored) : {};
        if (cache[domain]) {
          setIcon(cache[domain]);
          setIsFetchingIcon(false);
          return;
        }
      } catch (error) {
        // Failed to fetch cached icon, will generate new one
      }

      // 如果缓存中没有，则生成新图标
      const iconUrl = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
      setIcon(iconUrl);
      // 将图标保存到本地缓存
      try {
        const stored = localStorage.getItem(FAVICON_CACHE_KEY);
        const cache = stored ? JSON.parse(stored) : {};
        cache[domain] = iconUrl;
        localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
      } catch (error) {
        // Failed to cache icon - silently ignore
      }
    } catch (e) {
      console.error("Failed to fetch icon", e);
      alert("无法获取图标，请检查URL是否正确");
    } finally {
      setIsFetchingIcon(false);
    }
  };

  // 处理本地图标上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type)) {
      alert('请上传 PNG、JPG、SVG 或 ICO 格式的图标');
      return;
    }

    // 验证文件大小 (限制为 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('图标文件大小不能超过 2MB');
      return;
    }

    setIsFetchingIcon(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setIcon(base64String);
      setIsFetchingIcon(false);

      // 如果有URL，缓存到本地
      if (url) {
        let domain = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          domain = 'https://' + url;
        }
        try {
          const urlObj = new URL(domain);
          domain = urlObj.hostname;
          cacheCustomIcon(domain, base64String);
        } catch (error) {
          // Failed to parse URL for caching - silently ignore
        }
      }
    };

    reader.onerror = () => {
      alert('读取图标文件失败');
      setIsFetchingIcon(false);
    };

    reader.readAsDataURL(file);
  };

  // 触发文件选择
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 transition-transform duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {initialData ? '编辑链接' : '添加新链接'}
          </h3>
          <div className="flex items-center gap-2">
            {!initialData && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setBatchMode(!batchMode)}
              >
                <div className={`w-2 h-2 rounded-full ${batchMode ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 select-none">
                  {batchMode ? '批量模式已开' : '批量模式'}
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Top Actions Row: Pin & Delete */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${pinned
                  ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-750'
                  }`}
              >
                <Pin size={13} className={pinned ? "fill-current" : ""} />
                {pinned ? '已置顶' : '置顶'}
              </button>

              {initialData && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border bg-slate-50 border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:border-red-800/30 dark:hover:text-red-400"
                >
                  <Trash2 size={13} />
                  删除
                </button>
              )}
            </div>

            {/* Category Select - Compact */}
            <div className="relative min-w-[120px]">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                placeholder="网站标题"
              />
            </div>

            {/* URL Input */}
            <div>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium font-mono"
                placeholder="https://example.com"
              />
            </div>

            {/* Icon Section */}
            <div className="flex gap-3 items-start">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-2">
                {icon ? (
                  <img
                    src={icon}
                    alt="Icon"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="text-slate-300 dark:text-slate-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                    placeholder="图标链接..."
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleFetchIcon}
                      disabled={!url || isFetchingIcon}
                      className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="自动获取"
                    >
                      {isFetchingIcon ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="p-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="上传"
                    >
                      <Upload size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="autoFetchIcon"
                      checked={autoFetchIcon}
                      onChange={(e) => setAutoFetchIcon(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <label htmlFor="autoFetchIcon" className="text-[10px] text-slate-500 dark:text-slate-400 select-none cursor-pointer">
                      输入链接时自动获取
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">支持 SVG, PNG, ICO</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.ico,image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Description */}
            <div className="relative">
              <div className="absolute right-3 top-3">
                {(title && url) && (
                  <button
                    type="button"
                    onClick={handleAIAssist}
                    disabled={isGenerating}
                    className="flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md"
                  >
                    {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    {isGenerating ? '生成中...' : 'AI 填写'}
                  </button>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm min-h-[80px] resize-none"
                placeholder="添加描述..."
              />
            </div>
          </div>

          <div className="pt-2 relative">
            {showSuccessMessage && (
              <div className="absolute -top-12 left-0 right-0 mx-auto w-fit z-10 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                保存成功
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-accent text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-accent/90 transition-all shadow-lg shadow-slate-200 dark:shadow-none active:scale-[0.99] text-sm flex items-center justify-center gap-2"
            >
              <span>保存链接</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkModal;
