import {
    Folder as FolderIcon,
    Clock,
    Book,
    Plus,
    Search,
    Settings,
    LogOut,
    ChevronRight,
    ChevronDown,
    Trash2,
    BookOpen,
    MessageSquareText,
    PanelLeftClose,
    PanelLeft,
    Mic,
    FolderPlus,
    FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useState } from 'react';
import { Folder } from '@/services/supabaseService';

interface SidebarProps {
    folders: Folder[];
    selectedFolder: string;
    onSelectFolder: (id: string) => void;
    onCreateFolder: (parentId?: string | null) => void;
    onDeleteFolder?: (id: string) => void;
    onToggleSidebar?: () => void;
    onOpenBible?: () => void;
    onOpenAIChat?: () => void;
    onOpenRecordings?: () => void;
    isBibleOpen?: boolean;
    isAIChatOpen?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function Sidebar({
    folders,
    selectedFolder,
    onSelectFolder,
    onCreateFolder,
    onDeleteFolder,
    onOpenBible,
    onOpenAIChat,
    onOpenRecordings,
    isBibleOpen,
    isAIChatOpen,
    isCollapsed = false,
    onToggleCollapse
}: SidebarProps) {
    const { user, logout } = useAuth();
    const [search, setSearch] = useState('');
    const [isFoldersOpen, setIsFoldersOpen] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolderExpanded = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    // Build folder tree: top-level folders have no parentId
    const getChildFolders = (parentId: string | null | undefined) =>
        folders.filter(f => (f.parentId || null) === (parentId || null));

    const rootFolders = getChildFolders(null);

    const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
        <button
            onClick={() => onSelectFolder(id)}
            className={cn(
                "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md group",
                selectedFolder === id
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
                isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? label : undefined}
        >
            <Icon className={cn("w-4 h-4 shrink-0", selectedFolder === id ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300")} />
            {!isCollapsed && <span className="truncate">{label}</span>}
        </button>
    );

    // Recursive folder tree renderer
    const FolderTree = ({ parentId, depth = 0 }: { parentId: string | null, depth?: number }) => {
        const children = getChildFolders(parentId);
        if (children.length === 0) return null;

        return (
            <div className="space-y-0.5">
                {children.map(folder => {
                    const folderId = folder.id!;
                    const hasChildren = getChildFolders(folderId).length > 0;
                    const isExpanded = expandedFolders.has(folderId);

                    return (
                        <div key={folderId}>
                            <div
                                className="relative group"
                                style={{ paddingLeft: isCollapsed ? 0 : depth * 16 }}
                            >
                                <div className="flex items-center">
                                    {/* Expand/collapse chevron for folders with children */}
                                    {!isCollapsed && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (hasChildren) {
                                                    toggleFolderExpanded(folderId);
                                                }
                                            }}
                                            className={cn(
                                                "w-5 h-5 flex items-center justify-center shrink-0 transition-colors",
                                                hasChildren
                                                    ? "text-zinc-500 hover:text-zinc-300 cursor-pointer"
                                                    : "text-transparent cursor-default"
                                            )}
                                        >
                                            {hasChildren && (
                                                isExpanded
                                                    ? <ChevronDown className="w-3 h-3" />
                                                    : <ChevronRight className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}

                                    {/* Folder button */}
                                    <button
                                        onClick={() => onSelectFolder(folderId)}
                                        className={cn(
                                            "flex items-center flex-1 gap-2 px-2 py-2 text-sm font-medium transition-all rounded-md",
                                            selectedFolder === folderId
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
                                            isCollapsed && "justify-center px-2"
                                        )}
                                        title={isCollapsed ? folder.title : undefined}
                                    >
                                        <FolderIcon className={cn(
                                            "w-4 h-4 shrink-0",
                                            selectedFolder === folderId ? "text-blue-400" : "text-zinc-500"
                                        )} />
                                        {!isCollapsed && (
                                            <span className="truncate">{folder.title}</span>
                                        )}
                                    </button>

                                    {/* Actions: add sub-folder & delete */}
                                    {!isCollapsed && (
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Auto-expand when creating sub-folder
                                                    setExpandedFolders(prev => new Set(prev).add(folderId));
                                                    onCreateFolder(folderId);
                                                }}
                                                className="p-1 text-zinc-600 hover:text-blue-400 transition-colors"
                                                title="New sub-folder"
                                            >
                                                <FolderPlus className="w-3 h-3" />
                                            </button>
                                            {onDeleteFolder && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteFolder(folderId);
                                                    }}
                                                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                                                    title="Delete Folder"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Render children if expanded */}
                            {(isExpanded || isCollapsed) && hasChildren && (
                                <FolderTree parentId={folderId} depth={depth + 1} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={cn(
            "flex flex-col h-full bg-zinc-900 border-r border-zinc-800 shrink-0 transition-all duration-300",
            isCollapsed ? "w-[60px]" : "w-[280px]"
        )}>
            {/* Header with collapse toggle */}
            <div className={cn(
                "flex items-center h-14 border-b border-zinc-800 px-3",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                {!isCollapsed && (
                    <span className="font-bold text-sm text-zinc-200">WordFlow</span>
                )}
                <button
                    onClick={onToggleCollapse}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
            </div>

            {/* Search - hide when collapsed */}
            {!isCollapsed && (
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 text-sm bg-zinc-950/50 border border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-700 text-zinc-300 placeholder:text-zinc-600"
                        />
                    </div>
                </div>
            )}

            {/* Collapsed search icon */}
            {isCollapsed && (
                <div className="p-2 flex justify-center">
                    <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Search notes">
                        <Search className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Nav */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6 custom-scrollbar">
                <div>
                    {!isCollapsed && (
                        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                            Library
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <NavItem icon={Clock} label="Recent Notes" id="recent" />
                        <NavItem icon={Book} label="All Notes" id="all" />
                        <NavItem icon={FolderOpen} label="All Folders" id="folders" />
                    </div>
                </div>


                <div>
                    {!isCollapsed && (
                        <div
                            onClick={() => setIsFoldersOpen(!isFoldersOpen)}
                            className="flex items-center justify-between w-full px-3 mb-2 group hover:bg-zinc-800/50 rounded-md py-1 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <ChevronDown className={cn(
                                    "w-3 h-3 text-zinc-500 transition-transform",
                                    !isFoldersOpen && "-rotate-90"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-zinc-400">
                                    Folders ({folders.length})
                                </span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onCreateFolder(null); }}
                                className="text-zinc-500 hover:text-white transition-colors p-0.5"
                                title="New folder"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="flex justify-center mb-2">
                            <button onClick={() => onCreateFolder(null)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="New folder">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {(isFoldersOpen || isCollapsed) && (
                        <>
                            <FolderTree parentId={null} />
                            {folders.length === 0 && !isCollapsed && (
                                <div className="px-3 py-2 text-xs italic text-zinc-700">No folders yet</div>
                            )}
                        </>
                    )}
                </div>

                {/* Tools Section */}
                <div>
                    {!isCollapsed && (
                        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                            Tools
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <button
                            onClick={onOpenBible}
                            className={cn(
                                "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md group",
                                isBibleOpen
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? "Bible Reader" : undefined}
                        >
                            <BookOpen className={cn("w-4 h-4 shrink-0", isBibleOpen ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                            {!isCollapsed && <span className="truncate">Bible Reader</span>}
                            {isBibleOpen && !isCollapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                        <button
                            onClick={onOpenAIChat}
                            className={cn(
                                "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md group",
                                isAIChatOpen
                                    ? "bg-purple-500/10 text-purple-400"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? "Reformed AI" : undefined}
                        >
                            <MessageSquareText className={cn("w-4 h-4 shrink-0", isAIChatOpen ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                            {!isCollapsed && <span className="truncate">Reformed AI</span>}
                            {isAIChatOpen && !isCollapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
                        </button>
                        <button
                            onClick={onOpenRecordings}
                            className={cn(
                                "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md group",
                                "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? "Recordings Library" : undefined}
                        >
                            <Mic className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-orange-400" />
                            {!isCollapsed && <span className="truncate">Recordings</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* User Footer */}
            <div className="p-3 border-t border-zinc-800">
                <div className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer relative",
                    isCollapsed && "justify-center px-0"
                )}>
                    <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {user?.photoURL && <img src={user.photoURL} alt="User" />}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-medium text-zinc-200 truncate">{user?.displayName || 'User'}</div>
                                <div className="text-xs text-zinc-600 truncate">Pro Plan</div>
                            </div>
                            <button onClick={() => logout()} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-all">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
