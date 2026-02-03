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
import { useDialog } from './components/ui/DialogProvider';

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

import {
  GITHUB_REPO_URL,
  PRIVATE_CATEGORY_ID,
  PRIVATE_VAULT_KEY,
  PRIVACY_PASSWORD_KEY,
  PRIVACY_AUTO_UNLOCK_KEY,
  PRIVACY_GROUP_ENABLED_KEY,
  PRIVACY_SESSION_UNLOCKED_KEY,
  PRIVACY_USE_SEPARATE_PASSWORD_KEY,
  SYNC_META_KEY,
  SYNC_PASSWORD_KEY,
  getDeviceId
} from './utils/constants';
import { decryptPrivateVault, encryptPrivateVault } from './utils/privateVault';

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
    deleteCategories: deleteCategoriesStore,
    importData,
    isLoaded
  } = useDataStore();
  const { notify, confirm } = useDialog();

  // === Private Vault ===
  const [privateVaultCipher, setPrivateVaultCipher] = useState<string | null>(null);
  const [privateLinks, setPrivateLinks] = useState<LinkItem[]>([]);
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false);
  const [privateVaultPassword, setPrivateVaultPassword] = useState<string | null>(null);
  const [useSeparatePrivacyPassword, setUseSeparatePrivacyPassword] = useState(false);
  const [privacyGroupEnabled, setPrivacyGroupEnabled] = useState(false);
  const [privacyAutoUnlockEnabled, setPrivacyAutoUnlockEnabled] = useState(false);
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
  const [editingPrivateLink, setEditingPrivateLink] = useState<LinkItem | null>(null);
  const [prefillPrivateLink, setPrefillPrivateLink] = useState<Partial<LinkItem> | null>(null);

  // === Sync Engine ===
  const [syncConflictOpen, setSyncConflictOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);
  const hasInitialSyncRun = useRef(false);
  const autoUnlockAttemptedRef = useRef(false);
  const syncPasswordRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncPasswordRefreshIdRef = useRef(0);
  const lastSyncPasswordRef = useRef((localStorage.getItem(SYNC_PASSWORD_KEY) || '').trim());
  const isSyncPasswordRefreshingRef = useRef(false);
  const getLocalSyncMeta = useCallback(() => {
    const stored = localStorage.getItem(SYNC_META_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setPrivateVaultCipher(localStorage.getItem(PRIVATE_VAULT_KEY));
    setUseSeparatePrivacyPassword(localStorage.getItem(PRIVACY_USE_SEPARATE_PASSWORD_KEY) === '1');
    setPrivacyGroupEnabled(localStorage.getItem(PRIVACY_GROUP_ENABLED_KEY) === '1');
    setPrivacyAutoUnlockEnabled(localStorage.getItem(PRIVACY_AUTO_UNLOCK_KEY) === '1');
  }, []);

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

  const privateCategory = useMemo(() => ({
    id: PRIVATE_CATEGORY_ID,
    name: '隐私分组',
    icon: 'Lock'
  }), []);

  const privateCategories = useMemo(() => [privateCategory], [privateCategory]);

  // === Config (AI, Site Settings) ===
  const {
    aiConfig,
    saveAIConfig,
    restoreAIConfig,
    restoreSiteSettings,
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
    if (data.siteSettings) {
      restoreSiteSettings(data.siteSettings);
    }
    if (typeof data.privateVault === 'string') {
      setPrivateVaultCipher(data.privateVault);
      localStorage.setItem(PRIVATE_VAULT_KEY, data.privateVault);
      if (isPrivateUnlocked && privateVaultPassword) {
        decryptPrivateVault(privateVaultPassword, data.privateVault)
          .then(payload => setPrivateLinks(payload.links || []))
          .catch(() => {
            setIsPrivateUnlocked(false);
            setPrivateLinks([]);
            setPrivateVaultPassword(null);
            notify('隐私分组已锁定，请重新解锁', 'warning');
          });
      }
    }
  }, [updateData, restoreAIConfig, restoreSiteSettings, isPrivateUnlocked, notify, privateVaultPassword]);

  const handleSyncError = useCallback((error: string) => {
    console.error('[Sync Error]', error);
  }, []);

  const {
    syncStatus,
    lastSyncTime,
    pullFromCloud,
    pushToCloud,
    schedulePush,
    createBackup,
    restoreBackup,
    deleteBackup,
    resolveConflict: resolveSyncConflict,
    cancelPendingSync
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

  const isPrivateView = selectedCategory === PRIVATE_CATEGORY_ID;

  const resolvePrivacyPassword = useCallback((input?: string) => {
    const trimmed = input?.trim();
    if (trimmed) return trimmed;
    if (useSeparatePrivacyPassword) {
      return (localStorage.getItem(PRIVACY_PASSWORD_KEY) || '').trim();
    }
    return (localStorage.getItem(SYNC_PASSWORD_KEY) || '').trim();
  }, [useSeparatePrivacyPassword]);

  const handleUnlockPrivateVault = useCallback(async (input?: string) => {
    const password = resolvePrivacyPassword(input);
    if (!password) {
      notify('请先输入隐私分组密码', 'warning');
      return false;
    }

    if (!useSeparatePrivacyPassword) {
      const syncPassword = (localStorage.getItem(SYNC_PASSWORD_KEY) || '').trim();
      if (!syncPassword) {
        notify('请先设置同步密码，再解锁隐私分组', 'warning');
        return false;
      }
      if (password !== syncPassword) {
        notify('同步密码不匹配，请重新输入', 'error');
        return false;
      }
    }

    if (!privateVaultCipher) {
      setPrivateLinks([]);
      setIsPrivateUnlocked(true);
      setPrivateVaultPassword(password);
      if (privacyAutoUnlockEnabled) {
        sessionStorage.setItem(PRIVACY_SESSION_UNLOCKED_KEY, '1');
      }
      return true;
    }

    try {
      const payload = await decryptPrivateVault(password, privateVaultCipher);
      setPrivateLinks(payload.links || []);
      setIsPrivateUnlocked(true);
      setPrivateVaultPassword(password);
      if (privacyAutoUnlockEnabled) {
        sessionStorage.setItem(PRIVACY_SESSION_UNLOCKED_KEY, '1');
      }
      return true;
    } catch (error) {
      notify('密码错误或隐私数据已损坏', 'error');
      return false;
    }
  }, [privateVaultCipher, notify, resolvePrivacyPassword, useSeparatePrivacyPassword, privacyAutoUnlockEnabled]);

  const persistPrivateVault = useCallback(async (nextLinks: LinkItem[], passwordOverride?: string) => {
    const password = (passwordOverride || privateVaultPassword || resolvePrivacyPassword()).trim();
    if (!password) {
      notify('请先设置隐私分组密码', 'warning');
      return false;
    }

    try {
      const cipher = await encryptPrivateVault(password, { links: nextLinks });
      localStorage.setItem(PRIVATE_VAULT_KEY, cipher);
      setPrivateVaultCipher(cipher);
      setPrivateLinks(nextLinks);
      setIsPrivateUnlocked(true);
      setPrivateVaultPassword(password);
      return true;
    } catch (error) {
      notify('隐私分组加密失败，请重试', 'error');
      return false;
    }
  }, [notify, privateVaultPassword, resolvePrivacyPassword]);

  const handleMigratePrivacyMode = useCallback(async (payload: {
    useSeparatePassword: boolean;
    oldPassword: string;
    newPassword: string;
  }) => {
    const { useSeparatePassword, oldPassword, newPassword } = payload;
    const trimmedOld = oldPassword.trim();
    const trimmedNew = newPassword.trim();
    const syncPassword = (localStorage.getItem(SYNC_PASSWORD_KEY) || '').trim();

    if (!trimmedOld || !trimmedNew) {
      notify('请填写旧密码和新密码', 'warning');
      return false;
    }

    if (useSeparatePassword && !syncPassword) {
      notify('请先设置同步密码，再启用独立密码模式', 'warning');
      return false;
    }

    if (!useSeparatePassword && trimmedNew !== syncPassword) {
      notify('切换回同步密码时，新密码必须与同步密码一致', 'warning');
      return false;
    }

    const expectedOld = useSeparatePrivacyPassword
      ? (localStorage.getItem(PRIVACY_PASSWORD_KEY) || '').trim()
      : syncPassword;

    if (expectedOld && trimmedOld !== expectedOld) {
      notify('旧密码不正确', 'error');
      return false;
    }

    let nextLinks: LinkItem[] = privateLinks;
    if (privateVaultCipher) {
      try {
        const payloadData = await decryptPrivateVault(trimmedOld, privateVaultCipher);
        nextLinks = payloadData.links || [];
      } catch (error) {
        notify('旧密码不正确或隐私数据已损坏', 'error');
        return false;
      }
    }

    if (privateVaultCipher || nextLinks.length > 0) {
      const cipher = await encryptPrivateVault(trimmedNew, { links: nextLinks });
      localStorage.setItem(PRIVATE_VAULT_KEY, cipher);
      setPrivateVaultCipher(cipher);
    } else {
      localStorage.removeItem(PRIVATE_VAULT_KEY);
      setPrivateVaultCipher(null);
    }

    if (useSeparatePassword) {
      localStorage.setItem(PRIVACY_PASSWORD_KEY, trimmedNew);
      localStorage.setItem(PRIVACY_USE_SEPARATE_PASSWORD_KEY, '1');
    } else {
      localStorage.removeItem(PRIVACY_PASSWORD_KEY);
      localStorage.setItem(PRIVACY_USE_SEPARATE_PASSWORD_KEY, '0');
    }

    setUseSeparatePrivacyPassword(useSeparatePassword);
    setPrivateLinks(nextLinks);
    setIsPrivateUnlocked(true);
    setPrivateVaultPassword(trimmedNew);
    notify('隐私分组已完成迁移', 'success');
    return true;
  }, [notify, privateLinks, privateVaultCipher, useSeparatePrivacyPassword]);

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
    if (selectedCategory !== 'all' && selectedCategory !== PRIVATE_CATEGORY_ID) {
      result = result.filter(l => l.categoryId === selectedCategory);
    }

    // Sort by order
    return result.sort((a, b) => {
      const aOrder = a.order !== undefined ? a.order : a.createdAt;
      const bOrder = b.order !== undefined ? b.order : b.createdAt;
      return aOrder - bOrder;
    });
  }, [links, selectedCategory, searchQuery]);

  const displayedPrivateLinks = useMemo(() => {
    let result = privateLinks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    }

    return result.slice().sort((a, b) => {
      const aOrder = a.order !== undefined ? a.order : a.createdAt;
      const bOrder = b.order !== undefined ? b.order : b.createdAt;
      return aOrder - bOrder;
    });
  }, [privateLinks, searchQuery]);

  const activeDisplayedLinks = isPrivateView ? displayedPrivateLinks : displayedLinks;

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

  const emptySelection = useMemo(() => new Set<string>(), []);
  const effectiveIsBatchEditMode = isPrivateView ? false : isBatchEditMode;
  const effectiveSelectedLinks = isPrivateView ? emptySelection : selectedLinks;
  const effectiveSelectedLinksCount = isPrivateView ? 0 : selectedLinks.size;
  const effectiveToggleBatchEditMode = isPrivateView ? () => {} : toggleBatchEditMode;
  const effectiveSelectAll = isPrivateView ? () => {} : handleSelectAll;
  const effectiveBatchDelete = isPrivateView ? () => {} : handleBatchDelete;
  const effectiveBatchPin = isPrivateView ? () => {} : handleBatchPin;
  const effectiveBatchMove = isPrivateView ? () => {} : handleBatchMove;
  const handleLinkSelect = isPrivateView ? () => {} : toggleLinkSelection;

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
  const canSortCategory = selectedCategory !== 'all'
    && selectedCategory !== PRIVATE_CATEGORY_ID
    && displayedLinks.length > 1;

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

  const privateCount = privacyGroupEnabled && isPrivateUnlocked ? privateLinks.length : 0;
  const privateUnlockHint = useSeparatePrivacyPassword
    ? '请输入独立密码解锁隐私分组'
    : '请输入同步密码解锁隐私分组';
  const privateUnlockSubHint = useSeparatePrivacyPassword
    ? '独立密码仅保存在本地，切换设备需手动输入'
    : '同步密码来自数据设置';

  useEffect(() => {
    if (!privacyGroupEnabled || !privacyAutoUnlockEnabled || isPrivateUnlocked) return;
    if (sessionStorage.getItem(PRIVACY_SESSION_UNLOCKED_KEY) !== '1') return;
    if (autoUnlockAttemptedRef.current) return;
    autoUnlockAttemptedRef.current = true;
    handleUnlockPrivateVault().then((success) => {
      if (!success) {
        sessionStorage.removeItem(PRIVACY_SESSION_UNLOCKED_KEY);
      }
    });
  }, [privacyGroupEnabled, privacyAutoUnlockEnabled, isPrivateUnlocked, handleUnlockPrivateVault]);

  useEffect(() => {
    autoUnlockAttemptedRef.current = false;
  }, [privacyGroupEnabled, privacyAutoUnlockEnabled]);

  // === Handlers ===
  const handleImportConfirm = (newLinks: LinkItem[], newCategories: Category[]) => {
    importData(newLinks, newCategories);
    setIsImportModalOpen(false);
    notify(`成功导入 ${newLinks.length} 个新书签!`, 'success');
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

  const handleDeleteLink = async (id: string) => {
    const shouldDelete = await confirm({
      title: '删除链接',
      message: '确定删除此链接吗？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger'
    });

    if (shouldDelete) {
      deleteLink(id);
    }
  };

  const closePrivateModal = useCallback(() => {
    setIsPrivateModalOpen(false);
    setEditingPrivateLink(null);
    setPrefillPrivateLink(null);
  }, []);

  const openPrivateAddModal = useCallback(() => {
    if (!isPrivateUnlocked) {
      notify('请先解锁隐私分组', 'warning');
      return;
    }
    setEditingPrivateLink(null);
    setPrefillPrivateLink(null);
    setIsPrivateModalOpen(true);
  }, [isPrivateUnlocked, notify]);

  const openPrivateEditModal = useCallback((link: LinkItem) => {
    if (!isPrivateUnlocked) {
      notify('请先解锁隐私分组', 'warning');
      return;
    }
    setEditingPrivateLink(link);
    setIsPrivateModalOpen(true);
  }, [isPrivateUnlocked, notify]);

  const handlePrivateAddLink = useCallback(async (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!isPrivateUnlocked) {
      notify('请先解锁隐私分组', 'warning');
      return;
    }
    const maxOrder = privateLinks.reduce((max, link) => {
      const order = link.order !== undefined ? link.order : link.createdAt;
      return Math.max(max, order);
    }, -1);
    const newLink: LinkItem = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
      categoryId: PRIVATE_CATEGORY_ID,
      pinned: false,
      pinnedOrder: undefined,
      order: maxOrder + 1
    };
    await persistPrivateVault([...privateLinks, newLink]);
  }, [isPrivateUnlocked, notify, persistPrivateVault, privateLinks]);

  const handlePrivateEditLink = useCallback(async (data: Omit<LinkItem, 'createdAt'>) => {
    if (!isPrivateUnlocked) {
      notify('请先解锁隐私分组', 'warning');
      return;
    }
    const updatedLinks = privateLinks.map(link => link.id === data.id ? {
      ...link,
      ...data,
      categoryId: PRIVATE_CATEGORY_ID,
      pinned: false,
      pinnedOrder: undefined
    } : link);
    await persistPrivateVault(updatedLinks);
  }, [isPrivateUnlocked, notify, persistPrivateVault, privateLinks]);

  const handlePrivateDeleteLink = useCallback(async (id: string) => {
    if (!isPrivateUnlocked) {
      notify('请先解锁隐私分组', 'warning');
      return;
    }
    const shouldDelete = await confirm({
      title: '删除隐私链接',
      message: '确定删除此隐私链接吗？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger'
    });

    if (!shouldDelete) return;
    const updated = privateLinks.filter(link => link.id !== id);
    await persistPrivateVault(updated);
  }, [confirm, isPrivateUnlocked, notify, persistPrivateVault, privateLinks]);

  const handleAddLinkRequest = useCallback(() => {
    if (isPrivateView) {
      openPrivateAddModal();
      return;
    }
    openAddLinkModal();
  }, [isPrivateView, openPrivateAddModal, openAddLinkModal]);

  const handleLinkEdit = useCallback((link: LinkItem) => {
    if (isPrivateView) {
      openPrivateEditModal(link);
      return;
    }
    openEditLinkModal(link);
  }, [isPrivateView, openEditLinkModal, openPrivateEditModal]);

  const handleLinkContextMenu = useCallback((event: React.MouseEvent, link: LinkItem) => {
    if (isPrivateView) return;
    handleContextMenu(event, link);
  }, [handleContextMenu, isPrivateView]);

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

  const handleDeleteCategories = (catIds: string[]) => {
    deleteCategoriesStore(catIds);
  };

  const handleTogglePrivacyGroup = useCallback((enabled: boolean) => {
    setPrivacyGroupEnabled(enabled);
    localStorage.setItem(PRIVACY_GROUP_ENABLED_KEY, enabled ? '1' : '0');

    if (!enabled) {
      sessionStorage.removeItem(PRIVACY_SESSION_UNLOCKED_KEY);
      if (selectedCategory === PRIVATE_CATEGORY_ID) {
        setSelectedCategory('all');
      }
      setIsPrivateUnlocked(false);
      setPrivateVaultPassword(null);
      setPrivateLinks([]);
      setIsPrivateModalOpen(false);
      setEditingPrivateLink(null);
      setPrefillPrivateLink(null);
    }
  }, [selectedCategory, setSelectedCategory]);

  const handleTogglePrivacyAutoUnlock = useCallback((enabled: boolean) => {
    setPrivacyAutoUnlockEnabled(enabled);
    localStorage.setItem(PRIVACY_AUTO_UNLOCK_KEY, enabled ? '1' : '0');
    if (!enabled) {
      sessionStorage.removeItem(PRIVACY_SESSION_UNLOCKED_KEY);
    } else if (isPrivateUnlocked) {
      sessionStorage.setItem(PRIVACY_SESSION_UNLOCKED_KEY, '1');
    }
  }, [isPrivateUnlocked]);

  const handleSelectPrivate = useCallback(() => {
    if (!privacyGroupEnabled) {
      notify('隐私分组已关闭，可在设置中开启', 'warning');
      return;
    }
    setSelectedCategory(PRIVATE_CATEGORY_ID);
    setSidebarOpen(false);
  }, [notify, privacyGroupEnabled, setSelectedCategory, setSidebarOpen]);

  // === Bookmarklet URL Handler ===
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const addUrl = urlParams.get('add_url');
    if (addUrl) {
      const addTitle = urlParams.get('add_title') || '';
      window.history.replaceState({}, '', window.location.pathname);
      if (selectedCategory === PRIVATE_CATEGORY_ID) {
        if (!isPrivateUnlocked) {
          notify('请先解锁隐私分组', 'warning');
          return;
        }
        setPrefillPrivateLink({
          title: addTitle,
          url: addUrl,
          categoryId: PRIVATE_CATEGORY_ID
        });
        setEditingPrivateLink(null);
        openPrivateAddModal();
        return;
      }

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
  }, [
    setPrefillLink,
    setEditingLink,
    openAddLinkModal,
    categories,
    selectedCategory,
    notify,
    isPrivateUnlocked,
    openPrivateAddModal,
    setPrefillPrivateLink,
    setEditingPrivateLink
  ]);

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
  const backgroundImage = siteSettings.backgroundImage?.trim();
  const useCustomBackground = !!siteSettings.backgroundImageEnabled && !!backgroundImage;
  const backgroundMotion = siteSettings.backgroundMotion ?? false;

  // === KV Sync: Initial Load ===
  useEffect(() => {
    // 只在本地数据加载完成后执行一次
    if (!isLoaded || hasInitialSyncRun.current) return;
    hasInitialSyncRun.current = true;

    const checkCloudData = async () => {
      const localMeta = getLocalSyncMeta();
      const localVersion = localMeta?.version ?? 0;
      const localUpdatedAt = typeof localMeta?.updatedAt === 'number' ? localMeta.updatedAt : 0;
      const localDeviceId = localMeta?.deviceId || getDeviceId();
      const cloudData = await pullFromCloud();

      if (cloudData && cloudData.links && cloudData.categories) {
        // 版本不一致时提示用户选择
        if (cloudData.meta.version !== localVersion) {
          const localData = buildSyncData(
            links,
            categories,
            { mode: searchMode, externalSources: externalSearchSources },
            aiConfig,
            siteSettings,
            privateVaultCipher || undefined
          );
          handleSyncConflict({
            localData: { ...localData, meta: { updatedAt: localUpdatedAt, deviceId: localDeviceId, version: localVersion } },
            remoteData: cloudData
          });
        }
      }
    };

    checkCloudData();
  }, [isLoaded, pullFromCloud, links, categories, searchMode, externalSearchSources, aiConfig, siteSettings, privateVaultCipher, buildSyncData, handleSyncConflict, getLocalSyncMeta]);

  // === KV Sync: Auto-sync on data change ===
  const prevSyncDataRef = useRef<string | null>(null);

  useEffect(() => {
    // 跳过初始加载阶段
    if (!isLoaded || !hasInitialSyncRun.current || currentConflict) return;
    if (isSyncPasswordRefreshingRef.current) return;

    const syncData = buildSyncData(
      links,
      categories,
      { mode: searchMode, externalSources: externalSearchSources },
      aiConfig,
      siteSettings,
      privateVaultCipher || undefined
    );
    const serialized = JSON.stringify(syncData);

    if (serialized !== prevSyncDataRef.current) {
      prevSyncDataRef.current = serialized;
      schedulePush(syncData);
    }
  }, [links, categories, isLoaded, searchMode, externalSearchSources, aiConfig, siteSettings, privateVaultCipher, schedulePush, buildSyncData, currentConflict]);

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
      siteSettings,
      privateVaultCipher || undefined
    );
    await pushToCloud(syncData);
  }, [links, categories, searchMode, externalSearchSources, aiConfig, siteSettings, privateVaultCipher, pushToCloud]);

  const handleCreateBackup = useCallback(async () => {
    const syncData = buildSyncData(
      links,
      categories,
      { mode: searchMode, externalSources: externalSearchSources },
      aiConfig,
      siteSettings,
      privateVaultCipher || undefined
    );
    const success = await createBackup(syncData);
    if (success) {
      notify('备份已创建', 'success');
    } else {
      notify('备份失败，请稍后重试', 'error');
    }
    return success;
  }, [links, categories, searchMode, externalSearchSources, aiConfig, siteSettings, privateVaultCipher, createBackup, notify]);

  const handleManualPull = useCallback(async () => {
    const localMeta = getLocalSyncMeta();
    const localVersion = localMeta?.version ?? 0;
    const localUpdatedAt = typeof localMeta?.updatedAt === 'number' ? localMeta.updatedAt : 0;
    const localDeviceId = localMeta?.deviceId || getDeviceId();
    const cloudData = await pullFromCloud();
    if (cloudData && cloudData.links && cloudData.categories) {
      if (cloudData.meta.version !== localVersion) {
        const localData = buildSyncData(
          links,
          categories,
          { mode: searchMode, externalSources: externalSearchSources },
          aiConfig,
          siteSettings,
          privateVaultCipher || undefined
        );
        handleSyncConflict({
          localData: { ...localData, meta: { updatedAt: localUpdatedAt, deviceId: localDeviceId, version: localVersion } },
          remoteData: cloudData
        });
        return;
      }
      handleSyncComplete(cloudData);
    }
  }, [pullFromCloud, handleSyncComplete, getLocalSyncMeta, links, categories, searchMode, externalSearchSources, aiConfig, siteSettings, privateVaultCipher, buildSyncData, handleSyncConflict]);

  const handleSyncPasswordChange = useCallback((nextPassword: string) => {
    const trimmed = nextPassword.trim();
    if (trimmed === lastSyncPasswordRef.current) return;
    lastSyncPasswordRef.current = trimmed;

    if (syncPasswordRefreshTimerRef.current) {
      clearTimeout(syncPasswordRefreshTimerRef.current);
      syncPasswordRefreshTimerRef.current = null;
    }

    if (!trimmed) {
      isSyncPasswordRefreshingRef.current = false;
      return;
    }

    cancelPendingSync();
    isSyncPasswordRefreshingRef.current = true;
    syncPasswordRefreshIdRef.current += 1;
    const refreshId = syncPasswordRefreshIdRef.current;
    syncPasswordRefreshTimerRef.current = setTimeout(() => {
      syncPasswordRefreshTimerRef.current = null;
      handleManualPull()
        .finally(() => {
          if (syncPasswordRefreshIdRef.current === refreshId) {
            isSyncPasswordRefreshingRef.current = false;
          }
        });
    }, 600);
  }, [cancelPendingSync, handleManualPull]);

  useEffect(() => {
    return () => {
      if (syncPasswordRefreshTimerRef.current) {
        clearTimeout(syncPasswordRefreshTimerRef.current);
      }
    };
  }, []);

  const handleRestoreBackup = useCallback(async (backupKey: string) => {
    const confirmed = await confirm({
      title: '恢复云端备份',
      message: '此操作将用所选备份覆盖本地数据，并在云端创建一个回滚点。',
      confirmText: '恢复',
      cancelText: '取消',
      variant: 'danger'
    });
    if (!confirmed) return false;

    const restoredData = await restoreBackup(backupKey);
    if (!restoredData) {
      notify('恢复失败，请稍后重试', 'error');
      return false;
    }

    handleSyncComplete(restoredData);
    prevSyncDataRef.current = JSON.stringify(buildSyncData(
      restoredData.links,
      restoredData.categories,
      restoredData.searchConfig,
      restoredData.aiConfig,
      restoredData.siteSettings,
      restoredData.privateVault
    ));
    notify('已恢复到所选备份，并创建回滚点', 'success');
    return true;
  }, [confirm, restoreBackup, handleSyncComplete, notify, buildSyncData]);

  const handleDeleteBackup = useCallback(async (backupKey: string) => {
    const confirmed = await confirm({
      title: '删除备份',
      message: '确定要删除此备份吗?此操作无法撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger'
    });
    if (!confirmed) return false;

    const success = await deleteBackup(backupKey);
    if (!success) {
      notify('删除失败，请稍后重试', 'error');
      return false;
    }

    notify('备份已删除', 'success');
    return true;
  }, [confirm, deleteBackup, notify]);

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
          onDeleteCategories={handleDeleteCategories}
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
          onCreateBackup={handleCreateBackup}
          onRestoreBackup={handleRestoreBackup}
          onDeleteBackup={handleDeleteBackup}
          onSyncPasswordChange={handleSyncPasswordChange}
          useSeparatePrivacyPassword={useSeparatePrivacyPassword}
          onMigratePrivacyMode={handleMigratePrivacyMode}
          privacyGroupEnabled={privacyGroupEnabled}
          onTogglePrivacyGroup={handleTogglePrivacyGroup}
          privacyAutoUnlockEnabled={privacyAutoUnlockEnabled}
          onTogglePrivacyAutoUnlock={handleTogglePrivacyAutoUnlock}
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
        privacyGroupEnabled={privacyGroupEnabled}
        isPrivateUnlocked={isPrivateUnlocked}
        privateCount={privateCount}
        repoUrl={GITHUB_REPO_URL}
        onSelectAll={selectAll}
        onSelectCategory={handleCategoryClick}
        onSelectPrivate={handleSelectPrivate}
        onToggleCollapsed={toggleSidebarCollapsed}
        onOpenCategoryManager={() => setIsCatManagerOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative ${toneClasses.bg}`}>
        <div className="absolute inset-0 pointer-events-none">
          {useCustomBackground && (
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url("${backgroundImage}")` }}
            />
          )}

          {/* Light Mode Background */}
          <div className={`absolute inset-0 dark:hidden ${useCustomBackground ? 'bg-transparent' : 'bg-[#f8fafc]'}`}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className={`absolute left-[4%] top-[6%] w-[520px] h-[520px] rounded-full bg-accent/10 blur-[110px] mix-blend-multiply ${backgroundMotion ? 'animate-glow-drift' : ''}`}></div>
            <div className={`absolute right-[6%] top-[16%] w-[440px] h-[440px] rounded-full bg-accent/5 blur-[100px] mix-blend-multiply ${backgroundMotion ? 'animate-glow-drift-alt' : ''}`}></div>
            <div className={`absolute left-[28%] bottom-[6%] w-[560px] h-[560px] rounded-full bg-accent/10 blur-[120px] mix-blend-multiply opacity-70 ${backgroundMotion ? 'animate-glow-drift-slow' : ''}`}></div>
            {!useCustomBackground && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/80"></div>
            )}
          </div>

          {/* Dark Mode Atmosphere */}
          <div className={`absolute inset-0 hidden dark:block ${useCustomBackground ? 'bg-transparent' : 'bg-[#05070f]'}`}></div>
          <div
            className={`absolute inset-0 hidden dark:block ${backgroundMotion ? 'animate-aurora-shift' : ''}`}
            style={{
              backgroundImage:
                'radial-gradient(680px 420px at 14% 22%, rgb(var(--accent-color) / 0.15), transparent 62%), radial-gradient(560px 360px at 82% 18%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(520px 320px at 54% 58%, rgb(var(--accent-color) / 0.08), transparent 70%), radial-gradient(820px 520px at 50% 88%, rgb(var(--accent-color) / 0.10), transparent 70%)',
              backgroundSize: backgroundMotion ? '140% 140%' : undefined,
              backgroundPosition: backgroundMotion ? '30% 20%' : undefined
            }}
          ></div>
          {!useCustomBackground && (
            <div
              className="absolute inset-0 hidden dark:block opacity-40"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
                backgroundSize: '160px 160px',
                mixBlendMode: 'soft-light'
              }}
            ></div>
          )}
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
            onStartCategorySorting={() => {
              if (!isPrivateView) {
                startSorting(selectedCategory);
              }
            }}
            onSavePinnedSorting={savePinnedSorting}
            onCancelPinnedSorting={cancelPinnedSorting}
            onSaveCategorySorting={saveSorting}
            onCancelCategorySorting={cancelSorting}
            onAddLink={handleAddLinkRequest}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />

          <LinkSections
            linksCount={links.length}
            pinnedLinks={pinnedLinks}
            displayedLinks={activeDisplayedLinks}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            categories={categories}
            siteTitle={siteSettings.title}
            siteCardStyle={siteSettings.cardStyle}
            isSortingPinned={isSortingPinned}
            isSortingMode={isSortingMode}
            isBatchEditMode={effectiveIsBatchEditMode}
            selectedLinksCount={effectiveSelectedLinksCount}
            sensors={sensors}
            onPinnedDragEnd={handlePinnedDragEnd}
            onDragEnd={handleDragEnd}
            onToggleBatchEditMode={effectiveToggleBatchEditMode}
            onBatchDelete={effectiveBatchDelete}
            onBatchPin={effectiveBatchPin}
            onSelectAll={effectiveSelectAll}
            onBatchMove={effectiveBatchMove}
            onAddLink={handleAddLinkRequest}
            selectedLinks={effectiveSelectedLinks}
            onLinkSelect={handleLinkSelect}
            onLinkContextMenu={handleLinkContextMenu}
            onLinkEdit={handleLinkEdit}
            isPrivateUnlocked={isPrivateUnlocked}
            onPrivateUnlock={handleUnlockPrivateVault}
            privateUnlockHint={privateUnlockHint}
            privateUnlockSubHint={privateUnlockSubHint}
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
          defaultCategoryId={selectedCategory !== 'all' && selectedCategory !== PRIVATE_CATEGORY_ID ? selectedCategory : undefined}
          closeOnBackdrop={closeOnBackdrop}
        />
        <LinkModal
          isOpen={isPrivateModalOpen}
          onClose={closePrivateModal}
          onSave={editingPrivateLink ? handlePrivateEditLink : handlePrivateAddLink}
          onDelete={editingPrivateLink ? handlePrivateDeleteLink : undefined}
          categories={privateCategories}
          initialData={editingPrivateLink || (prefillPrivateLink as LinkItem)}
          aiConfig={aiConfig}
          defaultCategoryId={PRIVATE_CATEGORY_ID}
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
