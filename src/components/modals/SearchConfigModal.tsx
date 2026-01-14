import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Globe, Search, GripVertical, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { ExternalSearchSource } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SearchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ExternalSearchSource[];
  onSave: (sources: ExternalSearchSource[]) => void;
  closeOnBackdrop?: boolean;
}

// 可排序的列表项组件
const SortableSearchItem = ({
  source,
  onToggle,
  onDelete
}: {
  source: ExternalSearchSource;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: source.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // 获取 favicon URL
  const getFaviconUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.faviconextractor.com/favicon/${hostname}?larger=true`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group bg-white dark:bg-slate-800 ${isDragging ? 'shadow-lg ring-2 ring-accent border-transparent' : 'border-slate-200 dark:border-slate-700 hover:border-accent/50 dark:hover:border-accent/50'
        }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="touch-none flex items-center justify-center p-1 text-slate-400 hover:text-accent cursor-grab active:cursor-grabbing transition-colors"
      >
        <GripVertical size={16} />
      </div>

      {/* Icon */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-600">
        <img
          src={getFaviconUrl(source.url)}
          alt={source.name}
          className="w-5 h-5 object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <Globe size={16} className="text-slate-400 hidden" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">
            {source.name}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono mt-0.5">
          {source.url}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pl-3 border-l border-slate-100 dark:border-slate-700/50 ml-1">
        {/* Toggle Switch - iOS Style */}
        <button
          onClick={() => onToggle(source.id)}
          className={`relative w-10 h-6 rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-accent/20 ${source.enabled
              ? 'bg-accent shadow-[0_0_10px_rgb(var(--accent-color)/0.3)]'
              : 'bg-slate-200 dark:bg-slate-700'
            }`}
          title={source.enabled ? '已启用' : '已禁用'}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${source.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
          />
        </button>

        <button
          onClick={() => onDelete(source.id)}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors group/delete"
          title="删除"
        >
          <Trash2 size={15} className="transition-transform group-hover/delete:scale-110" />
        </button>
      </div>
    </div>
  );
};


const SearchConfigModal: React.FC<SearchConfigModalProps> = ({
  isOpen,
  onClose,
  sources,
  onSave,
  closeOnBackdrop = true
}) => {
  const [localSources, setLocalSources] = useState<ExternalSearchSource[]>(sources);
  const [newSource, setNewSource] = useState({ name: '', url: '' });
  const [isAdding, setIsAdding] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setLocalSources(sources);
      setIsAdding(false);
      setNewSource({ name: '', url: '' });
    }
  }, [sources, isOpen]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLocalSources((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.url) return;

    const source: ExternalSearchSource = {
      id: Date.now().toString(),
      name: newSource.name.trim(),
      url: newSource.url.trim(),
      icon: 'Globe',
      enabled: true,
      createdAt: Date.now()
    };

    setLocalSources([...localSources, source]);
    setNewSource({ name: '', url: '' });
    setIsAdding(false);
  };

  const handleDeleteSource = (id: string) => {
    if (confirm('确定要删除这个搜索源吗？')) {
      setLocalSources(localSources.filter(source => source.id !== id));
    }
  };

  const handleToggleEnabled = (id: string) => {
    setLocalSources(localSources.map(source =>
      source.id === id ? { ...source, enabled: !source.enabled } : source
    ));
  };

  const handleSave = () => {
    onSave(localSources);
    onClose();
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认搜索源列表吗？自定义的搜索源将丢失。')) {
      const defaultSources: ExternalSearchSource[] = [
        { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q={query}', icon: 'Search', enabled: true, createdAt: Date.now() },
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', icon: 'Search', enabled: true, createdAt: Date.now() },
        { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={query}', icon: 'Globe', enabled: true, createdAt: Date.now() },
        { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query={query}', icon: 'Globe', enabled: true, createdAt: Date.now() },
        { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/?text={query}', icon: 'Globe', enabled: true, createdAt: Date.now() },
        { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={query}', icon: 'Github', enabled: true, createdAt: Date.now() },
        { id: 'linuxdo', name: 'Linux.do', url: 'https://linux.do/search?q={query}', icon: 'Terminal', enabled: true, createdAt: Date.now() },
        { id: 'bilibili', name: 'B站', url: 'https://search.bilibili.com/all?keyword={query}', icon: 'Play', enabled: true, createdAt: Date.now() },
        { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query={query}', icon: 'Video', enabled: true, createdAt: Date.now() },
        { id: 'wikipedia', name: '维基', url: 'https://zh.wikipedia.org/wiki/Special:Search?search={query}', icon: 'BookOpen', enabled: true, createdAt: Date.now() }
      ];
      setLocalSources(defaultSources);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] transition-transform duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800/50 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/10 rounded-xl text-accent">
              <Search size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">搜索源</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">拖拽排序 · 自定义 · 数据同步</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">

          {/* Add Source Toggle */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="group w-full py-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-accent hover:bg-accent/5 dark:hover:bg-accent/10 transition-all text-slate-500 hover:text-accent font-medium flex items-center justify-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-colors">
                <Plus size={14} strokeWidth={3} />
              </div>
              <span>添加自定义搜索源</span>
            </button>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-top-2 ring-1 ring-slate-100 dark:ring-slate-700">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-1 h-4 bg-accent rounded-full"></div>
                  添加新搜索源
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">名称</label>
                  <input
                    type="text"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="例如：Google"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">搜索 URL</label>
                  <input
                    type="text"
                    value={newSource.url}
                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                    placeholder="https://.../search?q={query}"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={12} strokeWidth={2.5} />
                  </span>
                  <span>需要 <code className="font-mono font-bold text-orange-600 bg-orange-50 px-1 rounded">{'{query}'}</code> 占位符</span>
                </div>
                <button
                  onClick={handleAddSource}
                  disabled={!newSource.name || !newSource.url}
                  className="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/30 active:scale-95 flex items-center gap-2"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>确认添加</span>
                </button>
              </div>
            </div>
          )}

          {/* Sortable List */}
          <div className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localSources.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {localSources.map((source) => (
                  <SortableSearchItem
                    key={source.id}
                    source={source}
                    onToggle={handleToggleEnabled}
                    onDelete={handleDeleteSource}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 flex justify-between items-center shrink-0 backdrop-blur-sm z-10">
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-orange-500 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
          >
            <RotateCcw size={14} className="group-hover:-rotate-180 transition-transform duration-500" />
            重置默认
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="relative overflow-hidden px-7 py-2.5 text-sm font-bold bg-accent hover:bg-accent/90 text-white rounded-xl transition-all shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 active:scale-[0.98] flex items-center gap-2 group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]" />
              <Check size={18} strokeWidth={2.5} />
              <span>保存配置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchConfigModal;
