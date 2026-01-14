import React from 'react';
import { DndContext, DragEndEvent, closestCorners, SensorDescriptor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Pin, Trash2, CheckSquare, Upload, Search } from 'lucide-react';
import { Category, LinkItem } from '../../types';
import Icon from '../ui/Icon';
import LinkCard from '../ui/LinkCard';
import SortableLinkCard from '../ui/SortableLinkCard';

interface LinkSectionsProps {
  linksCount: number;
  pinnedLinks: LinkItem[];
  displayedLinks: LinkItem[];
  selectedCategory: string;
  searchQuery: string;
  categories: Category[];
  siteTitle: string;
  siteCardStyle: 'detailed' | 'simple';
  isSortingPinned: boolean;
  isSortingMode: string | null;
  isBatchEditMode: boolean;
  selectedLinksCount: number;
  selectedLinks: Set<string>;
  sensors: SensorDescriptor<any>[];
  onPinnedDragEnd: (event: DragEndEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onToggleBatchEditMode: () => void;
  onBatchDelete: () => void;
  onSelectAll: () => void;
  onBatchMove: (targetCategoryId: string) => void;
  onAddLink: () => void;
  onLinkSelect: (id: string) => void;
  onLinkContextMenu: (e: React.MouseEvent, link: LinkItem) => void;
  onLinkEdit: (link: LinkItem) => void;
}

const ClockWidget: React.FC = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  };

  return (
    <div className="flex flex-col items-end pointer-events-none select-none">
      <div className="text-4xl font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-900 dark:from-white dark:to-slate-400">
        {formatTime(time)}
      </div>
      <div className="text-xs font-medium text-accent mt-1 opacity-80">
        {formatDate(time)}
      </div>
    </div>
  );
};

const LinkSections: React.FC<LinkSectionsProps> = ({
  linksCount,
  pinnedLinks,
  displayedLinks,
  selectedCategory,
  searchQuery,
  categories,
  siteTitle,
  siteCardStyle,
  isSortingPinned,
  isSortingMode,
  isBatchEditMode,
  selectedLinksCount,
  selectedLinks,
  sensors,
  onPinnedDragEnd,
  onDragEnd,
  onToggleBatchEditMode,
  onBatchDelete,
  onSelectAll,
  onBatchMove,
  onAddLink,
  onLinkSelect,
  onLinkContextMenu,
  onLinkEdit
}) => {
  const showPinnedSection = pinnedLinks.length > 0 && !searchQuery && (selectedCategory === 'all');
  const showMainSection = (selectedCategory !== 'all' || searchQuery);
  const gridClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '凌晨好';
    if (hour < 11) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 19) return '下午好';
    return '晚上好';
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-0 scrollbar-hide">
      {/* Content wrapper with max-width - Added min-h and flex to push footer to bottom */}
      <div className="max-w-[1600px] mx-auto min-h-[calc(100vh-48px)] flex flex-col">


        {/* Dashboard Header / Greeting */}
        {!searchQuery && selectedCategory === 'all' && (
          <div className="pt-8 pb-4 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                {getGreeting()}，<span className="text-accent">{siteTitle}</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                准备开始高效的一天了吗？
              </p>
            </div>
            {/* Clock Widget */}
            <div className="hidden sm:block text-right">
              <ClockWidget />
            </div>
          </div>
        )}

        {!showPinnedSection && !showMainSection && (
          <div className="flex justify-center pt-12">
            <button
              onClick={onAddLink}
              className="group flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-700 shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-95 transition-all duration-300"
            >
              <span className="text-lg leading-none group-hover:rotate-90 transition-transform duration-300">+</span> 添加网址
            </button>
          </div>
        )}

        {/* Pinned Section */}
        {showPinnedSection && (
          <section className="pt-6">
            {/* Section Header with Stats Badge */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Pin size={16} className="text-accent" />
                </div>
                <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-400">
                  置顶 / 常用
                </h2>
              </div>
              {/* Stats as badge */}
              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{linksCount} 站点</span>
                <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{categories.length} 分类</span>
                <span className="px-2 py-1 rounded-full bg-accent/10 dark:bg-accent/20 text-accent">{pinnedLinks.length} 置顶</span>
              </div>
            </div>

            {isSortingPinned ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={onPinnedDragEnd}
              >
                <SortableContext
                  items={pinnedLinks.map((link) => link.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className={`grid gap-4 ${gridClassName}`}>
                    {pinnedLinks.map((link) => (
                      <SortableLinkCard
                        key={link.id}
                        link={link}
                        siteCardStyle={siteCardStyle}
                        isSortingMode={false}
                        isSortingPinned={isSortingPinned}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className={`grid gap-4 ${gridClassName}`}>
                {pinnedLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    siteCardStyle={siteCardStyle}
                    isBatchEditMode={isBatchEditMode}
                    isSelected={selectedLinks.has(link.id)}
                    onSelect={onLinkSelect}
                    onContextMenu={onLinkContextMenu}
                    onEdit={onLinkEdit}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Main Section */}
        {showMainSection && (
          <section className="pt-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-3">
                {selectedCategory !== 'all' && (
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Icon name={categories.find((c) => c.id === selectedCategory)?.icon || 'Folder'} size={16} className="text-accent" />
                  </div>
                )}
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  {selectedCategory === 'all'
                    ? (searchQuery ? '搜索结果' : '所有链接')
                    : categories.find((c) => c.id === selectedCategory)?.name
                  }
                </h2>
                {displayedLinks.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                    {displayedLinks.length}
                  </span>
                )}
              </div>

              {/* Batch Edit Controls */}
              {selectedCategory !== 'all' && !isSortingMode && (
                <div className="flex gap-2">
                  <button
                    onClick={onToggleBatchEditMode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${isBatchEditMode
                      ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/50'
                      : 'border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-accent hover:border-accent/50 focus:ring-accent/50'
                      }`}
                    title={isBatchEditMode ? '退出批量编辑' : '批量编辑'}
                  >
                    {isBatchEditMode ? '取消' : '批量编辑'}
                  </button>
                  {isBatchEditMode && (
                    <>
                      <button
                        onClick={onBatchDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        title="批量删除"
                      >
                        <Trash2 size={13} />
                        <span>删除</span>
                      </button>
                      <button
                        onClick={onSelectAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
                        title="全选/取消全选"
                      >
                        <CheckSquare size={13} />
                        <span>{selectedLinksCount === displayedLinks.length ? '取消全选' : '全选'}</span>
                      </button>
                      <div className="relative group">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          title="批量移动"
                        >
                          <Upload size={13} />
                          <span>移动</span>
                        </button>
                        <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                          {categories.filter((cat) => cat.id !== selectedCategory).map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => onBatchMove(cat.id)}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {displayedLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <Search size={32} className="opacity-40" />
                </div>
                <p className="text-sm">没有找到相关内容</p>
                {selectedCategory !== 'all' && (
                  <button onClick={onAddLink} className="mt-4 text-sm text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent/50 rounded">添加一个?</button>
                )}
              </div>
            ) : (
              isSortingMode === selectedCategory ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={displayedLinks.map((link) => link.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className={`grid gap-4 ${gridClassName}`}>
                      {displayedLinks.map((link) => (
                        <SortableLinkCard
                          key={link.id}
                          link={link}
                          siteCardStyle={siteCardStyle}
                          isSortingMode={true}
                          isSortingPinned={false}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className={`grid gap-4 ${gridClassName}`}>
                  {displayedLinks.map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      siteCardStyle={siteCardStyle}
                      isBatchEditMode={isBatchEditMode}
                      isSelected={selectedLinks.has(link.id)}
                      onSelect={onLinkSelect}
                      onContextMenu={onLinkContextMenu}
                      onEdit={onLinkEdit}
                    />
                  ))}
                </div>
              )
            )}
          </section>
        )}

        {/* Footer - Pushed to bottom */}
        <footer className="mt-auto pt-6 pb-3 text-center animate-in fade-in duration-700 delay-300">
          <div className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800">
            <span className="flex items-center gap-1.5 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent text-xs font-bold font-mono">
              Y-Nav <span className="text-slate-300 dark:text-slate-600 font-light">|</span> v{__APP_VERSION__}
            </span>
            <span className="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
            <a
              href="https://github.com/yml2213/Y-Nav.git"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-accent font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
          <p className="mt-2.5 text-[10px] text-slate-400/80 dark:text-slate-500 font-medium tracking-wide">
            Designed for Efficiency & Simplicity
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LinkSections;
