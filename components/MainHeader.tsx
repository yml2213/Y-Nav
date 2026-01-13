import React, { useState } from 'react';
import { Search, Moon, Sun, Menu, Monitor, Settings, GripVertical, Save, X, MoreHorizontal, LayoutGrid, List } from 'lucide-react';
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
        <div className="flex items-center gap-2 px-3 border-r border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => onSearchModeChange('internal')}
            className={`text-xs font-medium transition-all px-1.5 py-0.5 rounded ${searchMode === 'internal'
              ? 'text-accent bg-accent/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            title="站内搜索"
          >
            站内
          </button>
          <button
            onClick={() => onSearchModeChange('external')}
            className={`text-xs font-medium transition-all px-1.5 py-0.5 rounded ${searchMode === 'external'
              ? 'text-accent bg-accent/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            title="站外搜索"
          >
            站外
          </button>
        </div>

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
            type="text"
            placeholder={
              searchMode === 'internal'
                ? '搜索站内内容...'
                : selectedSearchSource
                  ? `在${selectedSearchSource.name}搜索`
                  : '搜索站外内容...'
            }
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchMode === 'external') {
                onExternalSearch();
              }
            }}
            className="w-full h-full pl-10 pr-10 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-0"
            style={{ fontSize: '14px' }}
            inputMode="search"
            enterKeyHint="search"
          />
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
          <button
            onClick={onToggleMobileSearch}
            className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/50"
            title="搜索"
          >
            <Search size={18} />
          </button>

          {/* Sort Controls - Primary Actions */}
          {showSortControls && (
            isSorting ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mr-1">排序中</span>
                <button
                  onClick={isSortingPinned ? onSavePinnedSorting : onSaveCategorySorting}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
                  title="保存顺序"
                >
                  <Save size={12} /> 保存
                </button>
                <button
                  onClick={isSortingPinned ? onCancelPinnedSorting : onCancelCategorySorting}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-slate-500 text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500/50 transition-colors"
                  title="取消排序"
                >
                  <X size={12} /> 取消
                </button>
              </div>
            ) : (
              <button
                onClick={canSortPinned ? onStartPinnedSorting : onStartCategorySorting}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:text-accent hover:border-accent/30 hover:shadow-md transition-all duration-200 backdrop-blur-sm"
                title={sortLabel}
              >
                <GripVertical size={14} /> 排序
              </button>
            )
          )}

          {/* Add Link - Primary Action */}
          <button
            onClick={onAddLink}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent hover:to-accent/90 text-white shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-95 transition-all duration-200"
            title="添加链接"
          >
            <span className="text-sm">+</span> 添加
          </button>

          {/* More Menu - Secondary Actions */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
              title="更多选项"
            >
              <MoreHorizontal size={18} />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-1.5 z-50 overflow-hidden">
                  {/* View Mode */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">视图模式</span>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => { onViewModeChange('simple'); setShowMoreMenu(false); }}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-all ${siteCardStyle === 'simple'
                          ? 'bg-accent/15 text-accent'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <List size={14} /> 简约
                      </button>
                      <button
                        onClick={() => { onViewModeChange('detailed'); setShowMoreMenu(false); }}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-all ${siteCardStyle === 'detailed'
                          ? 'bg-accent/15 text-accent'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <LayoutGrid size={14} /> 详情
                      </button>
                    </div>
                  </div>

                  {/* Theme */}
                  <button
                    onClick={() => { onToggleTheme(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {themeMode === 'system' ? <Monitor size={16} /> : darkMode ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{themeMode === 'system' ? '跟随系统' : darkMode ? '暗色主题' : '亮色主题'}</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => { onOpenSettings(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Settings size={16} />
                    <span>设置</span>
                  </button>
                </div>
              </>
            )}
          </div>
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
