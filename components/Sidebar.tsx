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
  const [displayText, setDisplayText] = React.useState('Nav');
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;
    const fullText = 'Nav';

    if (isDeleting) {
      if (displayText.length > 0) {
        // Continue deleting
        timeout = setTimeout(() => {
          setDisplayText(prev => prev.slice(0, -1));
        }, 100);
      } else {
        // Finished deleting, switch to typing after pause
        timeout = setTimeout(() => {
          setIsDeleting(false);
        }, 200);
      }
    } else {
      if (displayText.length < fullText.length) {
        // Continue typing
        timeout = setTimeout(() => {
          setDisplayText(fullText.slice(0, displayText.length + 1));
        }, 150);
      } else {
        // Finished typing, wait random time before deleting
        const randomDelay = Math.floor(Math.random() * 5000) + 5000; // 5-10s
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, randomDelay);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting]);

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30 ${sidebarWidthClass} transform transition-all duration-300 ease-in-out
        bg-white/40 dark:bg-slate-950/40 border-r border-slate-200/30 dark:border-white/5 backdrop-blur-2xl flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className={`h-14 flex items-center justify-center border-b border-slate-100/60 dark:border-white/5 shrink-0 relative ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
        <div className={`flex items-center ${isSidebarCollapsed ? 'w-full justify-center' : 'gap-2'}`}>
          {isSidebarCollapsed ? (
            <button
              onClick={onToggleCollapsed}
              className="h-9 w-9 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-center justify-center text-sm font-mono text-slate-500 dark:text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
              title="展开侧边栏"
            >
              Y
            </button>
          ) : (
            <div className="relative flex items-center justify-center font-mono font-bold text-lg cursor-pointer select-none group" title={navTitleText}>
              {/* Ghost element for layout sizing (holds the full width) */}
              <div className="flex items-center opacity-0 pointer-events-none" aria-hidden="true">
                <span className="mr-1.5">~/</span>
                <span className="tracking-tight">Y-</span>
                <span className="tracking-tight">Nav</span>
                <span className="w-2.5 ml-1"></span>
              </div>

              {/* Visible animated content */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                <span className="text-accent mr-1.5">~/</span>
                <span className="text-slate-700 dark:text-slate-200 tracking-tight">Y-</span>
                <span className="text-slate-700 dark:text-slate-200 tracking-tight">{displayText}</span>
                <span className="w-2.5 h-5 bg-accent ml-1 animate-pulse rounded-[2px] opacity-80 shadow-[0_0_8px_rgb(var(--accent-color)/0.6)]"></span>
              </div>
            </div>
          )}
        </div>

        {!isSidebarCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:inline-flex absolute right-2 p-1.5 text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
            title="收起侧边栏"
            aria-label="收起侧边栏"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Categories - 减少顶部间距 */}
      <div className={`flex-1 overflow-y-auto scrollbar-hide ${isSidebarCollapsed ? 'px-2 pt-2 pb-4' : 'px-3 pt-2 pb-4'}`}>
        {/* All / Pinned */}
        <button
          onClick={onSelectAll}
          title="置顶网站"
          className={`relative w-full rounded-xl transition-all duration-200 mb-1 ${isSidebarCollapsed ? 'flex items-center justify-center p-2.5' : 'flex items-center gap-3 px-3 py-2.5'} ${selectedCategory === 'all'
            ? 'bg-gradient-to-r from-accent/15 to-transparent text-accent shadow-sm ring-1 ring-inset ring-accent/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
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
                className={`relative w-full rounded-xl transition-all duration-200 group ${isSidebarCollapsed
                  ? 'flex items-center justify-center p-2.5'
                  : 'flex items-center gap-3 px-3 py-2'
                  } ${isSelected
                    ? 'bg-gradient-to-r from-accent/15 to-transparent text-accent shadow-sm ring-1 ring-inset ring-accent/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
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
