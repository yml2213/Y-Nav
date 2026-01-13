import React from 'react';
import { DndContext, DragEndEvent, closestCorners, SensorDescriptor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Pin, Trash2, CheckSquare, Upload, Search } from 'lucide-react';
import { Category, LinkItem } from '../types';
import Icon from './Icon';
import LinkCard from './LinkCard';
import SortableLinkCard from './SortableLinkCard';

interface LinkSectionsProps {
  linksCount: number;
  pinnedLinks: LinkItem[];
  displayedLinks: LinkItem[];
  selectedCategory: string;
  searchQuery: string;
  categories: Category[];
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

const LinkSections: React.FC<LinkSectionsProps> = ({
  linksCount,
  pinnedLinks,
  displayedLinks,
  selectedCategory,
  searchQuery,
  categories,
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
  const gridClassName = siteCardStyle === 'detailed'
    ? 'grid-cols-[repeat(auto-fill,minmax(260px,1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]';

  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-12">
      {/* Content wrapper with max-width for ultra-wide screens */}
      <div className="max-w-[1800px] mx-auto">

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
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Pin size={16} className="text-blue-500" />
                </div>
                <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-400">
                  置顶 / 常用
                </h2>
              </div>
              {/* Stats as badge */}
              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{linksCount} 站点</span>
                <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{categories.length} 分类</span>
                <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{pinnedLinks.length} 置顶</span>
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
      </div>
    </div>
  );
};

export default LinkSections;
