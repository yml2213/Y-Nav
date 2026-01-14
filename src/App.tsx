import React, { useMemo, useEffect, lazy, Suspense, useState, useCallback, useRef } from 'react';
import { LinkItem, Category, SyncConflict, YNavSyncData } from './types';

// Lazy load modal components for better code splitting
const LinkModal = lazy(() => import('./components/modals/LinkModal'));
const CategoryManagerModal = lazy(() => import('./components/modals/CategoryManagerModal'));
const ImportModal = lazy(() => import('./components/modals/ImportModal'));
const SettingsModal = lazy(() => import('./components/modals/SettingsModal'));
const SearchConfigModal = lazy(() => import('./components/modals/SearchConfigModal'));
const SyncConflictModal = lazy(() => import('./components/modals/SyncConflictModal'));

// Eagerly load frequently used components
import ContextMenu from './components/layout/ContextMenu';
import Sidebar from './components/layout/Sidebar';
import MainHeader from './components/layout/MainHeader';
import LinkSections from './components/layout/LinkSections';
import SyncStatusIndicator from './components/ui/SyncStatusIndicator';

import {
  useDataStore,
  useTheme,
  useSearch,
  useModals,
  useContextMenu,
  useBatchEdit,
  useSorting,
  useConfig,
  useSidebar,
  useSyncEngine,
  buildSyncData
} from './hooks';

import { GITHUB_REPO_URL } from './utils/constants';

function App() {
  // === Core Data ===
  const {
    links,
    categories,
    updateData,
    addLink,
    updateLink,
    deleteLink,
    togglePin: togglePinStore,
    reorderLinks,
    reorderPinnedLinks,
    deleteCategory: deleteCategoryStore,
    importData,
    isLoaded
  } = useDataStore();

  // === Sync Engine ===
  const [syncConflictOpen, setSyncConflictOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);
  const hasInitialSyncRun = useRef(false);

  // === Theme ===
  const { themeMode, darkMode, setThemeAndApply } = useTheme();

  // === Sidebar ===
  const {
    sidebarOpen,
    setSidebarOpen,
    isSidebarCollapsed,
    sidebarWidthClass,
    selectedCategory,
    setSelectedCategory,
    openSidebar,
    toggleSidebarCollapsed,
    handleCategoryClick,
    selectAll
  } = useSidebar();

  // === Config (AI, Site Settings) ===
  const {
    aiConfig,
    saveAIConfig,
    restoreAIConfig,
    siteSettings,
    handleViewModeChange,
    navTitleText,
    navTitleShort
  } = useConfig();

  // === Sync Engine Hook ===
  const handleSyncConflict = useCallback((conflict: SyncConflict) => {
    setCurrentConflict(conflict);
    setSyncConflictOpen(true);
  }, []);

  const handleSyncComplete = useCallback((data: YNavSyncData) => {
    // 当从云端恢复数据时更新本地数据
    if (data.links && data.categories) {
      updateData(data.links, data.categories);
    }
    if (data.searchConfig) {
      restoreSearchConfig(data.searchConfig);
    }
    if (data.aiConfig) {
      restoreAIConfig(data.aiConfig);
    }
  }, [updateData, restoreAIConfig]);

  const handleSyncError = useCallback((error: string) => {
    console.error('[Sync Error]', error);
  }, []);

  const {
    syncStatus,
    lastSyncTime,
    pullFromCloud,
    pushToCloud,
    schedulePush,
    resolveConflict: resolveSyncConflict
  } = useSyncEngine({
    onConflict: handleSyncConflict,
    onSyncComplete: handleSyncComplete,
    onError: handleSyncError
  });

  // === Search ===
  const {
    searchQuery,
    setSearchQuery,
    searchMode,
    externalSearchSources,
    selectedSearchSource,
    showSearchSourcePopup,
    setShowSearchSourcePopup,
    hoveredSearchSource,
    setHoveredSearchSource,
    setIsIconHovered,
    setIsPopupHovered,
    isMobileSearchOpen,
    handleSearchModeChange,
    handleSearchSourceSelect,
    handleExternalSearch,
    saveSearchConfig,
    restoreSearchConfig,
    toggleMobileSearch
  } = useSearch();

  // === Modals ===
  const {
    isModalOpen,
    editingLink,
    setEditingLink,
    prefillLink,
    setPrefillLink,
    openAddLinkModal,
    openEditLinkModal,
    closeLinkModal,
    isCatManagerOpen,
    setIsCatManagerOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isSearchConfigModalOpen,
    setIsSearchConfigModalOpen
  } = useModals();

  // === Computed: Displayed Links ===
  const pinnedLinks = useMemo(() => {
    const filteredPinnedLinks = links.filter(l => l.pinned);
    return filteredPinnedLinks.sort((a, b) => {
      if (a.pinnedOrder !== undefined && b.pinnedOrder !== undefined) {
        return a.pinnedOrder - b.pinnedOrder;
      }
      if (a.pinnedOrder !== undefined) return -1;
      if (b.pinnedOrder !== undefined) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [links]);

  const displayedLinks = useMemo(() => {
    let result = links;

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter(l => l.categoryId === selectedCategory);
    }

    // Sort by order
    return result.sort((a, b) => {
      const aOrder = a.order !== undefined ? a.order : a.createdAt;
      const bOrder = b.order !== undefined ? b.order : b.createdAt;
      return aOrder - bOrder;
    });
  }, [links, selectedCategory, searchQuery]);

  // === Batch Edit ===
  const {
    isBatchEditMode,
    selectedLinks,
    toggleBatchEditMode,
    toggleLinkSelection,
    handleBatchDelete,
    handleBatchMove,
    handleBatchPin,
    handleSelectAll
  } = useBatchEdit({
    links,
    categories,
    displayedLinks,
    updateData
  });

  // === Context Menu ===
  const {
    contextMenu,
    handleContextMenu,
    closeContextMenu,
    copyLinkToClipboard,
    editLinkFromContextMenu,
    deleteLinkFromContextMenu,
    togglePinFromContextMenu,
    duplicateLinkFromContextMenu,
    moveLinkFromContextMenu
  } = useContextMenu({
    links,
    categories,
    updateData,
    onEditLink: openEditLinkModal,
    isBatchEditMode
  });

  // === Sorting ===
  const {
    sensors,
    isSortingMode,
    isSortingPinned,
    isSortingCategory,
    startSorting,
    saveSorting,
    cancelSorting,
    startPinnedSorting,
    savePinnedSorting,
    cancelPinnedSorting,
    handleDragEnd,
    handlePinnedDragEnd
  } = useSorting({
    links,
    categories,
    selectedCategory,
    updateData,
    reorderLinks,
    reorderPinnedLinks
  });

  // === Computed: Sorting States ===
  const canSortPinned = selectedCategory === 'all' && !searchQuery && pinnedLinks.length > 1;
  const canSortCategory = selectedCategory !== 'all' && displayedLinks.length > 1;

  // === Computed: Link Counts ===
  const linkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize all categories with 0
    categories.forEach(cat => counts[cat.id] = 0);
    counts['pinned'] = 0;

    links.forEach(link => {
      // Count by category
      if (counts[link.categoryId] !== undefined) {
        counts[link.categoryId]++;
      } else {
        // Fallback for unknown categories, though shouldn't happen
        counts[link.categoryId] = 1;
      }

      // Count pinned
      if (link.pinned) {
        counts['pinned']++;
      }
    });

    return counts;
  }, [links, categories]);

  // === Handlers ===
  const handleImportConfirm = (newLinks: LinkItem[], newCategories: Category[]) => {
    importData(newLinks, newCategories);
    setIsImportModalOpen(false);
    alert(`成功导入 ${newLinks.length} 个新书签!`);
  };

  const handleAddLink = (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    addLink(data);
    setPrefillLink(undefined);
  };

  const handleEditLink = (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!editingLink) return;
    updateLink({ ...data, id: editingLink.id });
    setEditingLink(undefined);
  };

  const handleDeleteLink = (id: string) => {
    if (confirm('确定删除此链接吗?')) {
      deleteLink(id);
    }
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePinStore(id);
  };

  const handleUpdateCategories = (newCats: Category[]) => {
    updateData(links, newCats);
  };

  const handleDeleteCategory = (catId: string) => {
    deleteCategoryStore(catId);
  };

  // === Bookmarklet URL Handler ===
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const addUrl = urlParams.get('add_url');
    if (addUrl) {
      const addTitle = urlParams.get('add_title') || '';
      window.history.replaceState({}, '', window.location.pathname);
      const fallbackCategoryId = selectedCategory !== 'all'
        ? selectedCategory
        : (categories.find(c => c.id === 'common')?.id || categories[0]?.id || 'common');
      setPrefillLink({
        title: addTitle,
        url: addUrl,
        categoryId: fallbackCategoryId
      });
      setEditingLink(undefined);
      openAddLinkModal();
    }
  }, [setPrefillLink, setEditingLink, openAddLinkModal, categories, selectedCategory]);

  // === Appearance Setup ===
  useEffect(() => {
    if (siteSettings.accentColor) {
      document.documentElement.style.setProperty('--accent-color', siteSettings.accentColor);
    }
  }, [siteSettings.accentColor]);

  const toneClasses = useMemo(() => {
    const tone = siteSettings.grayScale;
    if (tone === 'zinc') return { bg: 'bg-zinc-50 dark:bg-zinc-950', text: 'text-zinc-900 dark:text-zinc-50' };
    if (tone === 'neutral') return { bg: 'bg-neutral-50 dark:bg-neutral-950', text: 'text-neutral-900 dark:text-neutral-50' };
    return { bg: 'bg-slate-50 dark:bg-slate-950', text: 'text-slate-900 dark:text-slate-50' };
  }, [siteSettings.grayScale]);

  const closeOnBackdrop = siteSettings.closeOnBackdrop ?? false;

  // === KV Sync: Initial Load ===
  useEffect(() => {
    // 只在本地数据加载完成后执行一次
    if (!isLoaded || hasInitialSyncRun.current) return;
    hasInitialSyncRun.current = true;

    const checkCloudData = async () => {
      const cloudData = await pullFromCloud();

      if (cloudData && cloudData.links && cloudData.categories) {
        // 比较版本，如果云端数据较新，弹出冲突对话框
        const localMeta = localStorage.getItem('ynav_sync_meta');
        const localVersion = localMeta ? JSON.parse(localMeta).version : 0;

        if (cloudData.meta.version > localVersion) {
          // 云端有更新的数据
          const localData = buildSyncData(links, categories, { mode: searchMode, externalSources: externalSearchSources }, aiConfig, siteSettings);
          handleSyncConflict({
            localData: { ...localData, meta: { updatedAt: Date.now(), deviceId: '', version: localVersion } },
            remoteData: cloudData
          });
        }
      }
    };

    checkCloudData();
  }, [isLoaded, pullFromCloud, links, categories, searchMode, externalSearchSources, aiConfig, siteSettings, buildSyncData, handleSyncConflict]);

  // === KV Sync: Auto-sync on data change ===
  const prevLinksRef = useRef<LinkItem[]>([]);
  const prevCategoriesRef = useRef<Category[]>([]);

  useEffect(() => {
    // 跳过初始加载阶段
    if (!isLoaded || !hasInitialSyncRun.current) return;

    // 检测数据是否发生变化
    const linksChanged = JSON.stringify(links) !== JSON.stringify(prevLinksRef.current);
    const categoriesChanged = JSON.stringify(categories) !== JSON.stringify(prevCategoriesRef.current);

    if (linksChanged || categoriesChanged) {
      prevLinksRef.current = [...links];
      prevCategoriesRef.current = [...categories];

      // 触发 debounce 同步
      const syncData = buildSyncData(
        links,
        categories,
        { mode: searchMode, externalSources: externalSearchSources },
        aiConfig,
        siteSettings
      );
      schedulePush(syncData);
    }
  }, [links, categories, isLoaded, searchMode, externalSearchSources, aiConfig, siteSettings, schedulePush]);

  // === Sync Conflict Resolution ===
  const handleResolveConflict = useCallback((choice: 'local' | 'remote') => {
    if (choice === 'remote' && currentConflict) {
      // 使用云端数据
      handleSyncComplete(currentConflict.remoteData);
    }
    resolveSyncConflict(choice);
    setSyncConflictOpen(false);
    setCurrentConflict(null);
  }, [currentConflict, handleSyncComplete, resolveSyncConflict]);

  // 手动触发同步
  const handleManualSync = useCallback(async () => {
    const syncData = buildSyncData(
      links,
      categories,
      { mode: searchMode, externalSources: externalSearchSources },
      aiConfig,
      siteSettings
    );
    await pushToCloud(syncData);
  }, [links, categories, searchMode, externalSearchSources, aiConfig, siteSettings, pushToCloud]);

  const handleManualPull = useCallback(async () => {
    const cloudData = await pullFromCloud();
    if (cloudData) {
      handleSyncComplete(cloudData);
    }
  }, [pullFromCloud, handleSyncComplete]);

  // === Render ===
  return (
    <div className={`flex h-screen overflow-hidden ${toneClasses.text}`}>
      {/* Modals - Wrapped in Suspense for lazy loading */}
      <Suspense fallback={null}>
        <CategoryManagerModal
          isOpen={isCatManagerOpen}
          onClose={() => setIsCatManagerOpen(false)}
          categories={categories}
          onUpdateCategories={handleUpdateCategories}
          onDeleteCategory={handleDeleteCategory}
          closeOnBackdrop={closeOnBackdrop}
        />

        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingLinks={links}
          categories={categories}
          onImport={handleImportConfirm}
          onImportSearchConfig={restoreSearchConfig}
          onImportAIConfig={restoreAIConfig}
          closeOnBackdrop={closeOnBackdrop}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          config={aiConfig}
          siteSettings={siteSettings}
          onSave={saveAIConfig}
          links={links}
          onUpdateLinks={(newLinks) => updateData(newLinks, categories)}
          onOpenImport={() => setIsImportModalOpen(true)}
          closeOnBackdrop={closeOnBackdrop}
        />

        <SearchConfigModal
          isOpen={isSearchConfigModalOpen}
          onClose={() => setIsSearchConfigModalOpen(false)}
          sources={externalSearchSources}
          onSave={(sources) => saveSearchConfig(sources, searchMode)}
          closeOnBackdrop={closeOnBackdrop}
        />

        {/* Sync Conflict Modal */}
        <SyncConflictModal
          isOpen={syncConflictOpen}
          conflict={currentConflict}
          onResolve={handleResolveConflict}
          onClose={() => setSyncConflictOpen(false)}
          closeOnBackdrop={closeOnBackdrop}
        />
      </Suspense>

      {/* Sync Status Indicator - Fixed bottom right */}
      <div className="fixed bottom-4 right-4 z-30">
        <SyncStatusIndicator
          status={syncStatus}
          lastSyncTime={lastSyncTime}
          onManualSync={handleManualSync}
          onManualPull={handleManualPull}
        />
      </div>

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        sidebarWidthClass={sidebarWidthClass}
        isSidebarCollapsed={isSidebarCollapsed}
        navTitleText={navTitleText}
        navTitleShort={navTitleShort}
        selectedCategory={selectedCategory}
        categories={categories}
        linkCounts={linkCounts}
        repoUrl={GITHUB_REPO_URL}
        onSelectAll={selectAll}
        onSelectCategory={handleCategoryClick}
        onToggleCollapsed={toggleSidebarCollapsed}
        onOpenCategoryManager={() => setIsCatManagerOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative ${toneClasses.bg}`}>
        <div className="absolute inset-0 pointer-events-none">
          {/* Light Mode Background */}
          <div className="absolute inset-0 bg-[#f8fafc] dark:hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-[-10%] top-[-10%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] mix-blend-multiply"></div>
            <div className="absolute right-[-10%] bottom-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/80"></div>
          </div>

          {/* Dark Mode Atmosphere */}
          <div className="absolute inset-0 hidden dark:block bg-[#05070f]"></div>
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                'radial-gradient(680px 420px at 12% 18%, rgb(var(--accent-color) / 0.15), transparent 62%), radial-gradient(560px 360px at 86% 12%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(820px 520px at 50% 90%, rgb(var(--accent-color) / 0.10), transparent 70%)'
            }}
          ></div>
          <div
            className="absolute inset-0 hidden dark:block opacity-40"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
              backgroundSize: '160px 160px',
              mixBlendMode: 'soft-light'
            }}
          ></div>
          <div
            className="absolute inset-0 hidden dark:block opacity-70"
            style={{
              backgroundImage:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.06), transparent 55%)'
            }}
          ></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <MainHeader
            navTitleText={navTitleText}
            siteCardStyle={siteSettings.cardStyle}
            themeMode={themeMode}
            darkMode={darkMode}
            isMobileSearchOpen={isMobileSearchOpen}
            searchMode={searchMode}
            searchQuery={searchQuery}
            externalSearchSources={externalSearchSources}
            hoveredSearchSource={hoveredSearchSource}
            selectedSearchSource={selectedSearchSource}
            showSearchSourcePopup={showSearchSourcePopup}
            canSortPinned={canSortPinned}
            canSortCategory={canSortCategory}
            isSortingPinned={isSortingPinned}
            isSortingCategory={isSortingCategory}
            onOpenSidebar={openSidebar}
            onSetTheme={setThemeAndApply}
            onViewModeChange={handleViewModeChange}
            onSearchModeChange={handleSearchModeChange}
            onOpenSearchConfig={() => setIsSearchConfigModalOpen(true)}
            onSearchQueryChange={setSearchQuery}
            onExternalSearch={handleExternalSearch}
            onSearchSourceSelect={handleSearchSourceSelect}
            onHoverSearchSource={setHoveredSearchSource}
            onIconHoverChange={setIsIconHovered}
            onPopupHoverChange={setIsPopupHovered}
            onToggleMobileSearch={toggleMobileSearch}
            onToggleSearchSourcePopup={() => setShowSearchSourcePopup(prev => !prev)}
            onStartPinnedSorting={startPinnedSorting}
            onStartCategorySorting={() => startSorting(selectedCategory)}
            onSavePinnedSorting={savePinnedSorting}
            onCancelPinnedSorting={cancelPinnedSorting}
            onSaveCategorySorting={saveSorting}
            onCancelCategorySorting={cancelSorting}
            onAddLink={openAddLinkModal}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />

          <LinkSections
            linksCount={links.length}
            pinnedLinks={pinnedLinks}
            displayedLinks={displayedLinks}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            categories={categories}
            siteTitle={siteSettings.title}
            siteCardStyle={siteSettings.cardStyle}
            isSortingPinned={isSortingPinned}
            isSortingMode={isSortingMode}
            isBatchEditMode={isBatchEditMode}
            selectedLinksCount={selectedLinks.size}
            sensors={sensors}
            onPinnedDragEnd={handlePinnedDragEnd}
            onDragEnd={handleDragEnd}
            onToggleBatchEditMode={toggleBatchEditMode}
            onBatchDelete={handleBatchDelete}
            onBatchPin={handleBatchPin}
            onSelectAll={handleSelectAll}
            onBatchMove={handleBatchMove}
            onAddLink={openAddLinkModal}
            selectedLinks={selectedLinks}
            onLinkSelect={toggleLinkSelection}
            onLinkContextMenu={handleContextMenu}
            onLinkEdit={openEditLinkModal}
          />
        </div>
      </main>

      {/* Link Modal */}
      <Suspense fallback={null}>
        <LinkModal
          isOpen={isModalOpen}
          onClose={closeLinkModal}
          onSave={editingLink ? handleEditLink : handleAddLink}
          onDelete={editingLink ? handleDeleteLink : undefined}
          categories={categories}
          initialData={editingLink || (prefillLink as LinkItem)}
          aiConfig={aiConfig}
          defaultCategoryId={selectedCategory !== 'all' ? selectedCategory : undefined}
          closeOnBackdrop={closeOnBackdrop}
        />
      </Suspense>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        categories={categories}
        onClose={closeContextMenu}
        onCopyLink={copyLinkToClipboard}
        onEditLink={editLinkFromContextMenu}
        onDuplicateLink={duplicateLinkFromContextMenu}
        onMoveLink={moveLinkFromContextMenu}
        onDeleteLink={deleteLinkFromContextMenu}
        onTogglePin={togglePinFromContextMenu}
      />
    </div>
  );
}

export default App;
