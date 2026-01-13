import React, { useEffect, useRef } from 'react';
import { Copy, Edit2, Trash2, Pin, CopyPlus, FolderInput, ChevronRight } from 'lucide-react';
import { Category } from '../types';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  categories: Category[];
  onClose: () => void;
  onCopyLink: () => void;
  onEditLink: () => void;
  onDuplicateLink: () => void;
  onMoveLink: (categoryId: string) => void;
  onDeleteLink: () => void;
  onTogglePin: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  categories,
  onClose,
  onCopyLink,
  onEditLink,
  onDuplicateLink,
  onMoveLink,
  onDeleteLink,
  onTogglePin
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      // 防止页面滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 确保菜单位置不会超出屏幕边界
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 400),
    y: Math.min(position.y, window.innerHeight - 300)
  };

  const menuItems = [
    { icon: Copy, label: '复制链接', onClick: onCopyLink },
    { icon: CopyPlus, label: '复制一份', onClick: onDuplicateLink },
    {
      icon: FolderInput,
      label: '转移分组',
      onClick: () => { },
      hasSubmenu: true
    },
    { icon: Edit2, label: '编辑链接', onClick: onEditLink },
    { icon: Pin, label: '置顶/取消置顶', onClick: onTogglePin },
    { icon: Trash2, label: '删除链接', onClick: onDeleteLink, className: 'text-red-500 dark:text-red-400' }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-xl py-1.5 min-w-[180px] backdrop-blur-sm bg-white/95 dark:bg-slate-900/95"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {menuItems.map((item, index) => (
        <div key={index} className="relative group">
          <button
            onClick={(e) => {
              if (item.hasSubmenu) return; // Prevent closing for submenu trigger
              e.preventDefault();
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${item.className || 'text-slate-700 dark:text-slate-300'
              }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={15} className={item.className || 'text-slate-500 dark:text-slate-400'} />
              <span>{item.label}</span>
            </div>
            {item.hasSubmenu && <ChevronRight size={14} className="text-slate-400" />}
          </button>

          {/* Submenu */}
          {item.hasSubmenu && (
            <div className="absolute left-full top-0 ml-1 w-48 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 max-h-64 overflow-y-auto scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMoveLink(cat.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ContextMenu;