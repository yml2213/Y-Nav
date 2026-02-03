import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, Edit2, Plus, Check, Palette, Square, CheckSquare } from 'lucide-react';
import { Category } from '../../types';
import { useDialog } from '../ui/DialogProvider';
import Icon from '../ui/Icon';
import IconSelector from '../ui/IconSelector';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdateCategories: (newCategories: Category[]) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteCategories?: (ids: string[]) => void;
  closeOnBackdrop?: boolean;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onUpdateCategories,
  onDeleteCategory,
  onDeleteCategories,
  closeOnBackdrop = true
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Folder');

  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false);
  const [iconSelectorTarget, setIconSelectorTarget] = useState<'edit' | 'new' | null>(null);

  // 多选模式状态
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const { notify, confirm } = useDialog();

  if (!isOpen) return null;

  // 切换多选模式
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedCategories(new Set()); // 清空选中
  };

  // 切换分类选中状态
  const toggleCategorySelection = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCategories.size === categories.length) {
      // 已全选,取消全选
      setSelectedCategories(new Set());
    } else {
      // 全选所有分类
      const allIds = new Set(categories.map(c => c.id));
      setSelectedCategories(allIds);
    }
  };

  const getFallbackCategory = (excludeIds: Set<string>) => {
    const remaining = categories.filter(c => !excludeIds.has(c.id));
    if (remaining.length === 0) return null;
    const common = remaining.find(c => c.id === 'common');
    return common || remaining[0];
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedCategories.size === 0) {
      notify('请先选择要删除的分类', 'warning');
      return;
    }

    const fallbackCategory = getFallbackCategory(selectedCategories);
    if (!fallbackCategory) {
      notify('至少保留一个分类', 'warning');
      return;
    }

    const shouldDelete = await confirm({
      title: '删除分类',
      message: `确定删除选中的 ${selectedCategories.size} 个分类吗？这些分类下的书签将移动到"${fallbackCategory.name}"。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger'
    });

    if (!shouldDelete) return;

    if (onDeleteCategories) {
      onDeleteCategories(Array.from(selectedCategories));
    } else {
      selectedCategories.forEach(id => onDeleteCategory(id));
    }
    setSelectedCategories(new Set());
    setIsBatchMode(false);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories];
    if (direction === 'up' && index > 0) {
      [newCats[index], newCats[index - 1]] = [newCats[index - 1], newCats[index]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    }
    onUpdateCategories(newCats);
  };

  const handleStartEdit = (cat: Category) => {
    startEdit(cat);
  };

  const handleDeleteClick = async (cat: Category) => {
    const fallbackCategory = getFallbackCategory(new Set([cat.id]));
    if (!fallbackCategory) {
      notify('至少保留一个分类', 'warning');
      return;
    }

    const prompt = cat.id === 'common'
      ? `确定删除默认分类"${cat.name}"吗？该分类下的书签将移动到"${fallbackCategory.name}"。`
      : `确定删除"${cat.name}"分类吗？该分类下的书签将移动到"${fallbackCategory.name}"。`;

    const shouldDelete = await confirm({
      title: '删除分类',
      message: prompt,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger'
    });

    if (shouldDelete) {
      onDeleteCategory(cat.id);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const newCats = categories.map(c => c.id === editingId ? {
      ...c,
      name: editName.trim(),
      icon: editIcon
    } : c);
    onUpdateCategories(newCats);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      icon: newCatIcon
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatIcon('Folder');
  };

  const openIconSelector = (target: 'edit' | 'new') => {
    setIconSelectorTarget(target);
    setIsIconSelectorOpen(true);
  };

  const handleIconSelect = (iconName: string) => {
    if (iconSelectorTarget === 'edit') {
      setEditIcon(iconName);
    } else if (iconSelectorTarget === 'new') {
      setNewCatIcon(iconName);
    }
  };

  const cancelIconSelector = () => {
    setIsIconSelectorOpen(false);
    setIconSelectorTarget(null);
  };

  const cancelAdd = () => {
    setNewCatName('');
    setNewCatIcon('Folder');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold dark:text-white">分类管理</h3>
          <div className="flex items-center gap-2">
            {/* 多选模式切换按钮 */}
            <button
              onClick={toggleBatchMode}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isBatchMode
                ? 'bg-accent text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              {isBatchMode ? '取消多选' : '多选'}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X className="w-5 h-5 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* 多选模式工具栏 */}
        {isBatchMode && (
          <div className="px-4 py-2 bg-accent/10 dark:bg-accent/20 border-b border-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-accent dark:text-accent hover:opacity-80"
              >
                {selectedCategories.size === categories.length ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                <span>全选</span>
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                已选择 {selectedCategories.size} 个分类
              </span>
            </div>
            <button
              onClick={handleBatchDelete}
              disabled={selectedCategories.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <Trash2 size={14} />
              <span>删除选中</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {categories.map((cat, index) => (
            <div key={cat.id} className={`flex flex-col p-3 rounded-lg group gap-2 ${isBatchMode && selectedCategories.has(cat.id)
              ? 'bg-accent/10 dark:bg-accent/20 border-2 border-accent'
              : 'bg-slate-50 dark:bg-slate-700/50'
              }`}>
              <div className="flex items-center gap-2">
                {/* 多选模式复选框 */}
                {isBatchMode && (
                  <button
                    onClick={() => toggleCategorySelection(cat.id)}
                    className="flex-shrink-0 p-1"
                  >
                    {selectedCategories.has(cat.id) ? (
                      <CheckSquare size={18} className="text-accent" />
                    ) : (
                      <Square size={18} className="text-slate-400 hover:text-accent" />
                    )}
                  </button>
                )}

                {/* Order Controls - 非多选模式显示 */}
                {!isBatchMode && (
                  <div className="flex flex-col gap-1 mr-2">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-slate-400 hover:text-blue-500 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-0.5 text-slate-400 hover:text-blue-500 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editingId === cat.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Icon name={editIcon} size={16} />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 p-1.5 px-2 text-sm rounded border border-accent dark:bg-slate-800 dark:text-white outline-none"
                          placeholder="分类名称"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          onClick={() => openIconSelector('edit')}
                          title="选择图标"
                        >
                          <Palette size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Icon name={cat.icon} size={16} />
                      <span className="font-medium dark:text-slate-200 truncate">
                        {cat.name}
                        {cat.id === 'common' && (
                          <span className="ml-2 text-xs text-slate-400">(默认分类)</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isBatchMode && (
                  <div className="flex items-center gap-1 self-start mt-1">
                    {editingId === cat.id ? (
                      <button onClick={saveEdit} className="text-green-500 hover:bg-green-50 dark:hover:bg-slate-600 p-1.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600"><Check size={16} /></button>
                    ) : (
                      <>
                        <button onClick={() => handleStartEdit(cat)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(cat)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">添加新分类</label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name={newCatIcon} size={16} />
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="分类名称"
                className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                onClick={() => openIconSelector('new')}
                title="选择图标"
              >
                <Palette size={16} />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={!newCatName.trim()}
                className="bg-accent text-white hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* 图标选择器弹窗 */}
          {isIconSelectorOpen && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={closeOnBackdrop ? cancelIconSelector : undefined}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">选择图标</h3>
                  <button
                    type="button"
                    onClick={cancelIconSelector}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <IconSelector
                    onSelectIcon={(iconName) => {
                      handleIconSelect(iconName);
                      setIsIconSelectorOpen(false);
                      setIconSelectorTarget(null);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;
