import { useState, useCallback } from 'react';
import { LinkItem } from '../types';

export function useModals() {
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isSearchConfigModalOpen, setIsSearchConfigModalOpen] = useState(false);

    // Link editing state
    const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
    const [prefillLink, setPrefillLink] = useState<Partial<LinkItem> | undefined>(undefined);

    // Open link modal for adding
    const openAddLinkModal = useCallback(() => {
        setEditingLink(undefined);
        setPrefillLink(undefined);
        setIsModalOpen(true);
    }, []);

    // Open link modal for editing
    const openEditLinkModal = useCallback((link: LinkItem) => {
        setEditingLink(link);
        setIsModalOpen(true);
    }, []);

    // Close link modal
    const closeLinkModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingLink(undefined);
        setPrefillLink(undefined);
    }, []);

    return {
        // Link Modal
        isModalOpen,
        setIsModalOpen,
        editingLink,
        setEditingLink,
        prefillLink,
        setPrefillLink,
        openAddLinkModal,
        openEditLinkModal,
        closeLinkModal,

        // Category Manager Modal
        isCatManagerOpen,
        setIsCatManagerOpen,
        openCatManager: () => setIsCatManagerOpen(true),
        closeCatManager: () => setIsCatManagerOpen(false),

        // Backup Modal
        isBackupModalOpen,
        setIsBackupModalOpen,
        openBackupModal: () => setIsBackupModalOpen(true),
        closeBackupModal: () => setIsBackupModalOpen(false),

        // Import Modal
        isImportModalOpen,
        setIsImportModalOpen,
        openImportModal: () => setIsImportModalOpen(true),
        closeImportModal: () => setIsImportModalOpen(false),

        // Settings Modal
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        openSettingsModal: () => setIsSettingsModalOpen(true),
        closeSettingsModal: () => setIsSettingsModalOpen(false),

        // Search Config Modal
        isSearchConfigModalOpen,
        setIsSearchConfigModalOpen,
        openSearchConfigModal: () => setIsSearchConfigModalOpen(true),
        closeSearchConfigModal: () => setIsSearchConfigModalOpen(false)
    };
}
