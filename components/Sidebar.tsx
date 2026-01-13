import React from 'react';
import { Upload, Settings, CloudCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category } from '../types';
import Icon from './Icon';

interface SidebarProps {
  sidebarOpen: boolean;
  sidebarWidthClass: string;
  isSidebarCollapsed: boolean;
  navTitleText: string;
  navTitleShort: string;
  selectedCategory: string;
  categories: Category[];
  repoUrl: string;
  onSelectAll: () => void;
  onSelectCategory: (category: Category) => void;
  onToggleCollapsed: () => void;
  onOpenCategoryManager: () => void;
  onOpenImport: () => void;
  onOpenBackup: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  sidebarWidthClass,
  isSidebarCollapsed,
  navTitleText,
  navTitleShort,
  selectedCategory,
  categories,
  repoUrl,
  onSelectAll,
  onSelectCategory,
  onToggleCollapsed,
  onOpenCategoryManager,
  onOpenImport,
  onOpenBackup,
  onOpenSettings
}) => {
  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30 ${sidebarWidthClass} transform transition-all duration-300 ease-in-out
        bg-white/90 dark:bg-slate-950/90 border-r border-slate-200/50 dark:border-white/5 backdrop-blur-xl flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Header - 减少顶部间距 */}
      <div className={`h-14 flex items-center border-b border-slate-100/60 dark:border-white/5 shrink-0 relative ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}>
        <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-2'}`}>
          {isSidebarCollapsed ? (
            <div className="h-7 w-7 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-center text-xs font-mono text-slate-500 dark:text-slate-400">
              Y
            </div>
          ) : (
            <div className="flex items-center font-mono font-bold text-lg cursor-pointer select-none group" title={navTitleText}>
              <span className="text-accent mr-1.5">~/</span>
              <span className="text-slate-700 dark:text-slate-200 tracking-tight">Y-Nav</span>
              <span className="w-2 h-4 bg-accent ml-1 animate-pulse rounded-sm"></span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapsed}
          className="hidden lg:inline-flex absolute right-2 p-1.5 text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
          title={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Categories - 减少顶部间距 */}
      <div className={`flex-1 overflow-y-auto scrollbar-hide ${isSidebarCollapsed ? 'px-2 pt-2 pb-4' : 'px-3 pt-2 pb-4'}`}>
        {/* All / Pinned */}
        <button
          onClick={onSelectAll}
          title="置顶网站"
          className={`relative w-full rounded-xl transition-all mb-1 ${isSidebarCollapsed ? 'flex items-center justify-center p-2.5' : 'flex items-center gap-3 px-3 py-2.5'} ${selectedCategory === 'all'
            ? 'bg-accent/10 text-accent'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/5'
            }`}
        >
          {!isSidebarCollapsed && selectedCategory === 'all' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-accent"></span>
          )}
          <div className={`flex items-center justify-center transition-colors ${isSidebarCollapsed ? 'p-2 rounded-lg' : 'p-1'} ${selectedCategory === 'all' ? 'text-accent' : 'text-slate-500 dark:text-slate-400'}`}>
            <Icon name="LayoutGrid" size={18} />
          </div>
          {!isSidebarCollapsed && <span className="font-medium">置顶网站</span>}
        </button>

        {/* Category Header */}
        <div className={`flex items-center mt-4 mb-2 ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'}`}>
          {!isSidebarCollapsed && (
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              分类目录
            </span>
          )}
          <button
            onClick={onOpenCategoryManager}
            className="p-1 text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
            title="管理分类"
          >
            <Settings size={13} />
          </button>
        </div>

        {/* Category List */}
        <div className="space-y-0.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                title={isSidebarCollapsed ? cat.name : undefined}
                className={`relative w-full rounded-xl transition-all group ${isSidebarCollapsed
                    ? 'flex items-center justify-center p-2.5'
                    : 'flex items-center gap-3 px-3 py-2'
                  } ${isSelected
                    ? 'bg-slate-100/70 dark:bg-white/5 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/5'
                  }`}
              >
                {!isSidebarCollapsed && isSelected && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-accent"></span>
                )}
                <div className={`flex items-center justify-center transition-colors ${isSidebarCollapsed ? 'p-2 rounded-lg' : 'p-1.5 rounded-md'
                  } ${isSelected
                    ? 'text-accent'
                    : 'text-slate-500 dark:text-slate-500'
                  }`}>
                  <Icon name={cat.icon} size={16} />
                </div>
                {!isSidebarCollapsed && (
                  <span className={`truncate flex-1 text-left text-sm ${isSelected ? 'font-medium' : ''}`}>{cat.name}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      {!isSidebarCollapsed && (
        <div className="px-3 py-3 border-t border-slate-100/60 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenImport}
              className="flex-1 p-2 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
              title="导入书签"
            >
              <Upload size={14} className="mx-auto" />
            </button>
            <button
              onClick={onOpenBackup}
              className="flex-1 p-2 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
              title="备份与恢复"
            >
              <CloudCog size={14} className="mx-auto" />
            </button>
            <button
              onClick={onOpenSettings}
              className="flex-1 p-2 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
              title="AI 设置"
            >
              <Settings size={14} className="mx-auto" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
