import React, { useState } from 'react';
import { Search, Moon, Sun, Menu, Monitor, Settings, GripVertical, Save, X, MoreHorizontal, LayoutGrid, List, CheckCircle } from 'lucide-react';
import { ExternalSearchSource, SearchMode } from '../types';

interface MainHeaderProps {
  navTitleText: string;
  siteCardStyle: 'detailed' | 'simple';
  themeMode: 'light' | 'dark' | 'system';
  darkMode: boolean;
  isMobileSearchOpen: boolean;
  searchMode: SearchMode;
  searchQuery: string;
  externalSearchSources: ExternalSearchSource[];
  hoveredSearchSource: ExternalSearchSource | null;
  selectedSearchSource: ExternalSearchSource | null;
  showSearchSourcePopup: boolean;
  canSortPinned: boolean;
  canSortCategory: boolean;
  isSortingPinned: boolean;
  isSortingCategory: boolean;
  onOpenSidebar: () => void;
  onToggleTheme: () => void;
  onViewModeChange: (mode: 'simple' | 'detailed') => void;
  onSearchModeChange: (mode: SearchMode) => void;
  onOpenSearchConfig: () => void;
  onSearchQueryChange: (value: string) => void;
  onExternalSearch: () => void;
  onSearchSourceSelect: (source: ExternalSearchSource) => void;
  onHoverSearchSource: (source: ExternalSearchSource | null) => void;
  onIconHoverChange: (value: boolean) => void;
  onPopupHoverChange: (value: boolean) => void;
  onToggleMobileSearch: () => void;
  onToggleSearchSourcePopup: () => void;
  onStartPinnedSorting: () => void;
  onStartCategorySorting: () => void;
  onSavePinnedSorting: () => void;
  onCancelPinnedSorting: () => void;
  onSaveCategorySorting: () => void;
  onCancelCategorySorting: () => void;
  onAddLink: () => void;
  onOpenSettings: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  navTitleText,
  siteCardStyle,
  themeMode,
  darkMode,
  isMobileSearchOpen,
  searchMode,
  searchQuery,
  externalSearchSources,
  hoveredSearchSource,
  selectedSearchSource,
  showSearchSourcePopup,
  canSortPinned,
  canSortCategory,
  isSortingPinned,
  isSortingCategory,
  onOpenSidebar,
  onToggleTheme,
  onViewModeChange,
  onSearchModeChange,
  onOpenSearchConfig,
  onSearchQueryChange,
  onExternalSearch,
  onSearchSourceSelect,
  onHoverSearchSource,
  onIconHoverChange,
  onPopupHoverChange,
  onToggleMobileSearch,
  onToggleSearchSourcePopup,
  onStartPinnedSorting,
  onStartCategorySorting,
  onSavePinnedSorting,
  onCancelPinnedSorting,
  onSaveCategorySorting,
  onCancelCategorySorting,
  onAddLink,
  onOpenSettings
}) => {
  const showSortControls = canSortPinned || canSortCategory || isSortingPinned || isSortingCategory;
  const sortLabel = canSortPinned ? '排序置顶' : '排序分类';
  const isSorting = isSortingPinned || isSortingCategory;

  // More menu dropdown state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchBar = (
    <div className="relative w-full group">
      {searchMode === 'external' && showSearchSourcePopup && (
        <div
          className="absolute left-0 top-full mt-2 w-full bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-xl border border-slate-200/50 dark:border-white/10 p-3 z-50 backdrop-blur-xl"
          onMouseEnter={() => onPopupHoverChange(true)}
          onMouseLeave={() => onPopupHoverChange(false)}
        >
          <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5">
            {externalSearchSources
              .filter((source) => source.enabled)
              .map((source, index) => (
                <button
                  key={index}
                  onClick={() => onSearchSourceSelect(source)}
                  onMouseEnter={() => onHoverSearchSource(source)}
                  onMouseLeave={() => onHoverSearchSource(null)}
                  className={`px-2 py-2.5 text-sm rounded-lg transition-all flex flex-col items-center gap-1.5 ${selectedSearchSource?.id === source.id
                    ? 'bg-accent/15 text-accent'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <img
                      src={`https://www.faviconextractor.com/favicon/${new URL(source.url).hostname}?larger=true`}
                      alt={source.name}
                      className="w-4 h-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXNlYXJjaCI+PHBhdGggZD0ibTIxIDIxLTQuMzQtNC4zNCI+PC9wYXRoPjxjaXJjbGUgY3g9IjExIiBjeT0iMTEiIHI9IjgiPjwvY2lyY2xlPjwvc3ZnPg==';
                      }}
                    />
                  </div>
                  <span className="truncate text-xs hidden sm:block">{source.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="flex items-center h-11 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm group-focus-within:ring-2 group-focus-within:ring-accent/20 group-focus-within:border-accent/50 group-focus-within:bg-white dark:group-focus-within:bg-slate-900">
        <div className="flex items-center gap-1 pl-1.5 py-1">
          <button
            onClick={() => onSearchModeChange('internal')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${searchMode === 'internal'
              ? 'bg-white dark:bg-slate-800 text-accent shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            title="站内搜索"
          >
            站内
          </button>
          <button
            onClick={() => onSearchModeChange('external')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${searchMode === 'external'
              ? 'bg-white dark:bg-slate-800 text-accent shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            title="站外搜索"
          >
            站外
          </button>
        </div>

        {/* Vertical Separator */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

        <div className="relative flex-1">
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-accent transition-colors"
            onMouseEnter={() => searchMode === 'external' && onIconHoverChange(true)}
            onMouseLeave={() => onIconHoverChange(false)}
            onClick={() => {
              if (searchMode === 'external') {
                onToggleSearchSourcePopup();
              }
            }}
            title={searchMode === 'external' ? '选择搜索源' : '站内搜索'}
          >
            {searchMode === 'internal' ? (
              <Search size={15} />
            ) : (hoveredSearchSource || selectedSearchSource) ? (
              <img
                src={`https://www.faviconextractor.com/favicon/${new URL((hoveredSearchSource || selectedSearchSource).url).hostname}?larger=true`}
                alt={(hoveredSearchSource || selectedSearchSource).name}
                className="w-4 h-4"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXNlYXJjaCI+PHBhdGggZD0ibTIxIDIxLTQuMzQtNC4zNCI+PC9wYXRoPjxjaXJjbGUgY3g9IjExIiBjeT0iMTEiIHI9IjgiPjwvY2lyY2xlPjwvc3ZnPg==';
                }}
              />
            ) : (
              <Search size={15} />
            )}
          </button>

          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              searchMode === 'internal'
                ? '搜索站内资源...'
                : selectedSearchSource
                  ? `在 ${selectedSearchSource.name} 搜索`
                  : '搜索全网内容...'
            }
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchMode === 'external') {
                onExternalSearch();
              }
            }}
            className="w-full h-full pl-10 pr-20 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-0"
            style={{ fontSize: '14px' }}
            inputMode="search"
            enterKeyHint="search"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none select-none">
            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {searchMode === 'external' && (
          <button
            onClick={onOpenSearchConfig}
            className="px-3 text-slate-400 hover:text-accent transition-colors"
            title="管理搜索源"
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/30 dark:border-white/5 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl">
      <div className="h-14 px-4 lg:px-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={onOpenSidebar} className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Menu size={20} />
          </button>
        </div>

        <div className="flex-1 hidden md:flex justify-center">
          <div className="w-full max-w-xl">
            {searchBar}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <button
            onClick={onToggleMobileSearch}
            className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/50"
            title="搜索"
          >
            <Search size={18} />
          </button>

          {/* View Mode Toggles (Desktop) */}
          <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 mr-1">
            <button
              onClick={() => onViewModeChange('simple')}
              className={`p-1.5 rounded-lg transition-all ${siteCardStyle === 'simple'
                ? 'bg-white dark:bg-slate-700 text-accent shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              title="简约视图"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => onViewModeChange('detailed')}
              className={`p-1.5 rounded-lg transition-all ${siteCardStyle === 'detailed'
                ? 'bg-white dark:bg-slate-700 text-accent shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              title="详情视图"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {/* Sort Controls */}
          {showSortControls && (
            isSorting ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  正在排序
                </span>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button
                  onClick={isSortingPinned ? onSavePinnedSorting : onSaveCategorySorting}
                  className="p-1 rounded-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 hover:scale-105 transition-all"
                  title="保存排序"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={isSortingPinned ? onCancelPinnedSorting : onCancelCategorySorting}
                  className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:scale-105 transition-all"
                  title="取消"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={canSortPinned ? onStartPinnedSorting : onStartCategorySorting}
                className="p-2 rounded-xl text-slate-500 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
                title={sortLabel}
              >
                <GripVertical size={18} />
              </button>
            )
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-white/5"
            title={themeMode === 'system' ? '跟随系统' : darkMode ? '切换亮色' : '切换深色'}
          >
            {themeMode === 'system' ? <Monitor size={18} /> : darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-500 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-white/5 mr-1"
            title="系统设置"
          >
            <Settings size={18} />
          </button>

          {/* Add Link - Primary Action */}
          <button
            onClick={onAddLink}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent hover:to-accent/90 text-white shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-95 transition-all duration-200"
            title="添加链接"
          >
            <span className="text-lg leading-none">+</span> <span className="hidden sm:inline">添加</span>
          </button>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className="md:hidden px-4 pb-3">
          {searchBar}
        </div>
      )}
    </header>
  );
};

export default MainHeader;
