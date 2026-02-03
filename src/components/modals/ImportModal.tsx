import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, Upload, FileText, ArrowRight, Check, AlertCircle, FolderInput, ListTree, Database } from 'lucide-react';
import { Category, LinkItem, SearchConfig, AIConfig } from '../../types';
import { parseBookmarks } from '../../services/bookmarkParser';
import { useDialog } from '../ui/DialogProvider';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingLinks: LinkItem[];
    categories: Category[];
    onImport: (newLinks: LinkItem[], newCategories: Category[]) => void;
    onImportSearchConfig?: (searchConfig: SearchConfig) => void;
    onImportAIConfig?: (aiConfig: AIConfig) => void;
    closeOnBackdrop?: boolean;
}

interface ParsedImportLink extends LinkItem {
    folderPath?: string[];
    isDuplicate?: boolean;
}

interface FolderOption {
    key: string;
    label: string;
    path: string[];
    count: number;
}

const getFolderKey = (path?: string[]) => JSON.stringify(path || []);
const getFolderLabel = (path?: string[]) => {
    if (!path || path.length === 0) return '根目录';
    return path.join(' / ');
};

const normalizeUrlForCompare = (input: string) => {
    const raw = (input || '').trim();
    if (!raw) return '';
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw);
    const withScheme = hasScheme ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        url.hash = '';
        url.hostname = url.hostname.toLowerCase();
        if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
            url.port = '';
        }
        if (url.pathname !== '/' && url.pathname.endsWith('/')) {
            url.pathname = url.pathname.replace(/\/+$/, '');
        }
        return url.toString();
    } catch {
        return raw.replace(/\/+$/, '');
    }
};

const ImportModal: React.FC<ImportModalProps> = ({
    isOpen,
    onClose,
    existingLinks,
    categories,
    onImport,
    onImportSearchConfig,
    onImportAIConfig,
    closeOnBackdrop = true
}) => {
    const { notify } = useDialog();
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Staging Data
    const [parsedLinks, setParsedLinks] = useState<ParsedImportLink[]>([]);
    const [parsedCategories, setParsedCategories] = useState<Category[]>([]);
    const [parsedSearchConfig, setParsedSearchConfig] = useState<SearchConfig | null>(null);
    const [parsedAIConfig, setParsedAIConfig] = useState<AIConfig | null>(null);

    // Options
    const [importMode, setImportMode] = useState<'original' | 'merge'>('original');
    const [targetCategoryId, setTargetCategoryId] = useState<string>(categories[0]?.id || 'common');
    const [importType, setImportType] = useState<'html' | 'json'>('html');
    const [selectedFolderKeys, setSelectedFolderKeys] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

    const folderOptions = useMemo<FolderOption[]>(() => {
        if (importType !== 'html') return [];
        const folderMap = new Map<string, { path: string[]; count: number }>();
        parsedLinks.forEach(link => {
            const path = link.folderPath || [];
            const key = getFolderKey(path);
            const existing = folderMap.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                folderMap.set(key, { path, count: 1 });
            }
        });
        return Array.from(folderMap.entries())
            .map(([key, value]) => ({
                key,
                label: getFolderLabel(value.path),
                path: value.path,
                count: value.count
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [importType, parsedLinks]);

    useEffect(() => {
        if (importType !== 'html' || step !== 'preview') return;
        if (folderOptions.length === 0) return;
        setSelectedFolderKeys(prev => {
            if (prev.size > 0) return prev;
            return new Set(folderOptions.map(option => option.key));
        });
    }, [folderOptions, importType, step]);

    const selectedLinks = useMemo(() => {
        if (importType !== 'html') return parsedLinks;
        if (folderOptions.length === 0) return parsedLinks;
        if (selectedFolderKeys.size === 0) return [];
        return parsedLinks.filter(link => selectedFolderKeys.has(getFolderKey(link.folderPath)));
    }, [folderOptions.length, importType, parsedLinks, selectedFolderKeys]);

    const uniqueNewLinks = useMemo(
        () => selectedLinks.filter(link => !link.isDuplicate),
        [selectedLinks]
    );

    const duplicateCount = useMemo(
        () => selectedLinks.filter(link => link.isDuplicate).length,
        [selectedLinks]
    );

    const selectedCategoryIds = useMemo(() => {
        return new Set(uniqueNewLinks.map(link => link.categoryId));
    }, [uniqueNewLinks]);

    const filteredCategories = useMemo(() => {
        if (importType !== 'html') return parsedCategories;
        return parsedCategories.filter(category => selectedCategoryIds.has(category.id));
    }, [importType, parsedCategories, selectedCategoryIds]);

    const newLinksCount = uniqueNewLinks.length;
    const existingCategoryNames = useMemo(
        () => new Set(categories.map(category => category.name)),
        [categories]
    );
    const newCategoriesCount = useMemo(() => {
        return filteredCategories.filter(category => !existingCategoryNames.has(category.name)).length;
    }, [existingCategoryNames, filteredCategories]);

    const allFoldersSelected = folderOptions.length > 0 && selectedFolderKeys.size === folderOptions.length;
    const isFolderSelectionEmpty = importType === 'html'
        && folderOptions.length > 0
        && selectedFolderKeys.size === 0;

    const toggleFolderSelection = (key: string) => {
        setSelectedFolderKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const toggleAllFolders = () => {
        setSelectedFolderKeys(prev => {
            if (folderOptions.length === 0) return prev;
            if (prev.size === folderOptions.length) {
                return new Set();
            }
            return new Set(folderOptions.map(option => option.key));
        });
    };

    // Parse JSON backup file
    const parseJsonBackup = async (file: File): Promise<{ links: ParsedImportLink[]; categories: Category[]; searchConfig?: SearchConfig; aiConfig?: AIConfig }> => {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate the structure
        if (!data.links || !Array.isArray(data.links) || !data.categories || !Array.isArray(data.categories)) {
            throw new Error('Invalid backup file format');
        }

        return {
            links: data.links,
            categories: data.categories,
            searchConfig: data.searchConfig,
            aiConfig: data.aiConfig
        };
    };

    if (!isOpen) return null;

    const resetState = () => {
        setStep('upload');
        setFile(null);
        setParsedLinks([]);
        setParsedCategories([]);
        setParsedSearchConfig(null);
        setParsedAIConfig(null);
        setImportType('html');
        setSelectedFolderKeys(new Set());
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'html' | 'json') => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setAnalyzing(true);
        setImportType(type);

        try {
            let result: { links: ParsedImportLink[]; categories: Category[]; searchConfig?: SearchConfig; aiConfig?: AIConfig };

            if (type === 'html') {
                result = await parseBookmarks(selectedFile);
            } else {
                result = await parseJsonBackup(selectedFile);
            }

            // 2. Diff Logic
            const existingUrls = new Set(existingLinks.map(l => normalizeUrlForCompare(l.url))); // Normalize URLs for stable dedupe

            const parsedWithDuplicates = result.links.map(link => {
                const normalizedUrl = normalizeUrlForCompare(link.url);
                return {
                    ...link,
                    isDuplicate: existingUrls.has(normalizedUrl)
                };
            });

            setParsedLinks(parsedWithDuplicates);
            setParsedCategories(result.categories);
            setParsedSearchConfig(result.searchConfig || null);
            setParsedAIConfig(result.aiConfig || null);
            setSelectedFolderKeys(new Set());

            setStep('preview');
        } catch (error) {
            const errorMessage = type === 'html'
                ? "解析文件失败，请确保是标准的 Chrome HTML 书签文件。"
                : "解析文件失败，请确保是有效的 Y-Nav 备份文件。";
            notify(errorMessage, 'error');
            console.error(error);
        } finally {
            setAnalyzing(false);
        }
    };

    const executeImport = () => {
        const linksToImport = uniqueNewLinks.map(({ isDuplicate, folderPath, ...link }) => link);
        let finalLinks = [...linksToImport];
        let finalCategories: Category[] = [];

        if (importMode === 'merge') {
            // Flatten all new links to the target category
            finalLinks = finalLinks.map(link => ({
                ...link,
                categoryId: targetCategoryId
            }));
            // In merge mode, we do NOT add new categories from the file
            finalCategories = [];
        } else {
            // Keep structure mode
            // We need to merge categories carefully.
            // Since parseBookmarks generates IDs for categories, if a category name already exists in `categories`, 
            // we should remap the links to the existing category ID instead of creating a new duplicate-named category.

            const nameToIdMap = new Map<string, string>();
            categories.forEach(c => nameToIdMap.set(c.name, c.id));

            // Valid new categories to add
            const categoriesToAdd: Category[] = [];

            filteredCategories.forEach(pc => {
                if (nameToIdMap.has(pc.name)) {
                    // Category exists, we don't add it.
                    // But we need to know its ID to remap links.
                } else {
                    categoriesToAdd.push(pc);
                    nameToIdMap.set(pc.name, pc.id); // Add new one to map
                }
            });

            const fallbackCategoryId = categories.find(c => c.id === 'common')?.id
                || categories[0]?.id
                || categoriesToAdd[0]?.id;

            // Remap links
            finalLinks = finalLinks.map(link => {
                // Find the name of the category this link was assigned to in the parser
                const originalCat = filteredCategories.find(c => c.id === link.categoryId)
                    || categories.find(c => c.id === link.categoryId); // Fallback

                if (originalCat && nameToIdMap.has(originalCat.name)) {
                    return { ...link, categoryId: nameToIdMap.get(originalCat.name)! };
                }
                // If for some reason we can't find the map, put it in a fallback category
                return fallbackCategoryId
                    ? { ...link, categoryId: fallbackCategoryId }
                    : link;
            });

            finalCategories = categoriesToAdd;
        }

        onImport(finalLinks, finalCategories);

        // Import search config if available
        if (parsedSearchConfig && onImportSearchConfig) {
            onImportSearchConfig(parsedSearchConfig);
        }

        // Import AI config if available
        if (parsedAIConfig && onImportAIConfig) {
            onImportAIConfig(parsedAIConfig);
        }

        handleClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeOnBackdrop ? handleClose : undefined}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                        <Upload size={20} className="text-accent" /> 导入书签
                    </h3>
                    <button onClick={handleClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">

                    {step === 'upload' && (
                        <div className="space-y-4">
                            {/* HTML Import Option */}
                            <div className="flex flex-col items-center justify-center space-y-4 py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".html"
                                    onChange={(e) => handleFileChange(e, 'html')}
                                />

                                {analyzing && importType === 'html' ? (
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mb-2"></div>
                                        <span className="text-slate-500">正在分析书签文件...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-accent/10 dark:bg-accent/20 rounded-full text-accent dark:text-accent">
                                            <FileText size={32} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium dark:text-white">点击选择 HTML 文件</p>
                                            <p className="text-xs text-slate-500 mt-1">支持 Chrome, Edge, Firefox 导出的书签</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* JSON Import Option */}
                            <div className="flex flex-col items-center justify-center space-y-4 py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                onClick={() => jsonFileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    ref={jsonFileInputRef}
                                    className="hidden"
                                    accept=".json"
                                    onChange={(e) => handleFileChange(e, 'json')}
                                />

                                {analyzing && importType === 'json' ? (
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-2"></div>
                                        <span className="text-slate-500">正在分析备份文件...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                            <Database size={32} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium dark:text-white">导入 ynav_backup.json 文件</p>
                                            <p className="text-xs text-slate-500 mt-1">Y-Nav 标准备份格式，便于数据迁移</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-100 dark:border-green-900/30">
                                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{newLinksCount}</div>
                                    <div className="text-xs text-green-700 dark:text-green-500">新增链接</div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center border border-slate-200 dark:border-slate-600">
                                    <div className="text-xl font-bold text-slate-600 dark:text-slate-400">{duplicateCount}</div>
                                    <div className="text-xs text-slate-500">重复跳过</div>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center border border-purple-100 dark:border-purple-900/30">
                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{importMode === 'original' ? newCategoriesCount : 0}</div>
                                    <div className="text-xs text-purple-700 dark:text-purple-500">新增分类</div>
                                </div>
                            </div>

                            {newLinksCount === 0 && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm">
                                    <AlertCircle size={16} />
                                    <span>
                                        {isFolderSelectionEmpty
                                            ? '未选择任何文件夹。'
                                            : (selectedLinks.length === 0
                                                ? '未发现可导入的链接。'
                                                : '未发现新链接，所有链接已存在。')}
                                    </span>
                                </div>
                            )}

                            {newLinksCount === 0 && duplicateCount > 0 && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    提示：删除分类不会删除书签，书签会被移动到其他分类；可在“全部/常用推荐”中检查并批量删除后再导入。
                                </div>
                            )}

                            {newLinksCount > 0 && (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium dark:text-slate-300">导入方式</label>

                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${importMode === 'original' ? 'border-accent bg-accent/10 dark:bg-accent/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                        <input type="radio" name="mode" className="mt-1" checked={importMode === 'original'} onChange={() => setImportMode('original')} />
                                        <div>
                                            <div className="flex items-center gap-2 font-medium text-sm dark:text-white">
                                                <ListTree size={16} /> 保持原目录结构
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">如果分类不存在，将自动创建。</p>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${importMode === 'merge' ? 'border-accent bg-accent/10 dark:bg-accent/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                        <input type="radio" name="mode" className="mt-1" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
                                        <div className="w-full">
                                            <div className="flex items-center gap-2 font-medium text-sm dark:text-white">
                                                <FolderInput size={16} /> 全部导入到指定目录
                                            </div>
                                            <div className="mt-2">
                                                <select
                                                    value={targetCategoryId}
                                                    onChange={(e) => setTargetCategoryId(e.target.value)}
                                                    disabled={importMode !== 'merge'}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {importType === 'html' && folderOptions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium dark:text-slate-300">选择导入文件夹</label>
                                        <button
                                            type="button"
                                            onClick={toggleAllFolders}
                                            className="text-xs text-slate-500 hover:text-accent transition-colors"
                                        >
                                            {allFoldersSelected ? '取消全选' : '全选'}
                                        </button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {folderOptions.map(option => (
                                            <label
                                                key={option.key}
                                                className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                            >
                                                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFolderKeys.has(option.key)}
                                                        onChange={() => toggleFolderSelection(option.key)}
                                                        className="rounded border-slate-300 text-accent focus:ring-accent/40"
                                                    />
                                                    <span className="truncate">{option.label}</span>
                                                </span>
                                                <span className="text-xs text-slate-400">{option.count}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedFolderKeys.size === 0 && (
                                        <div className="text-xs text-amber-600 dark:text-amber-400">
                                            请至少选择一个文件夹
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                    {step === 'upload' ? (
                        <button onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">取消</button>
                    ) : (
                        <>
                            <button onClick={resetState} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">重新选择</button>
                            <button
                                onClick={executeImport}
                                disabled={newLinksCount === 0}
                                className="px-4 py-2 text-sm bg-slate-900 dark:bg-accent text-white hover:bg-slate-800 dark:hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 font-medium"
                            >
                                <Check size={16} /> 确认导入 ({newLinksCount})
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ImportModal;
