import {
    Folder as FolderIcon,
    Clock,
    Book,
    Plus,
    Search,
    Settings,
    LogOut,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Folder } from '@/services/firestoreService';

interface SidebarProps {
    folders: Folder[];
    selectedFolder: string;
    onSelectFolder: (id: string) => void;
    onCreateFolder: () => void;
    onDeleteFolder?: (id: string) => void;
    onToggleSidebar?: () => void;
}

export function Sidebar({
    folders,
    selectedFolder,
    onSelectFolder,
    onCreateFolder,
    onDeleteFolder
}: SidebarProps) {
    const { user, logout } = useAuth();
    const [search, setSearch] = useState('');

    const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
        <button
            onClick={() => onSelectFolder(id)}
            className={cn(
                "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md group",
                selectedFolder === id
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            )}
        >
            <Icon className={cn("w-4 h-4", selectedFolder === id ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300")} />
            <span className="truncate">{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-full w-[280px] bg-zinc-900 border-r border-zinc-800 shrink-0">
            {/* Header */}
            <div className="flex items-center h-14 px-4 border-b border-zinc-800/50">
                <div className="flex items-center justify-center w-6 h-6 mr-3 bg-blue-600 rounded-md">
                    <span className="text-xs font-bold text-white">W</span>
                </div>
                <span className="text-sm font-semibold tracking-tight text-white">WordFlow</span>
            </div>

            {/* Search */}
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

            {/* Nav */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6">
                <div>
                    <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        Library
                    </div>
                    <div className="space-y-0.5">
                        <NavItem icon={Clock} label="Recent Notes" id="recent" />
                        <NavItem icon={Book} label="All Notes" id="all" />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between px-3 mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                            Folders
                        </div>
                        <button onClick={onCreateFolder} className="text-zinc-500 hover:text-white transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="space-y-0.5">
                        {folders.map(folder => (
                            <div key={folder.id} className="relative group">
                                <NavItem
                                    icon={FolderIcon}
                                    label={folder.title}
                                    id={folder.id!}
                                />
                                {onDeleteFolder && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteFolder(folder.id!);
                                        }}
                                        className="absolute right-2 top-1.5 p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Folder"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {folders.length === 0 && (
                            <div className="px-3 py-2 text-xs italic text-zinc-700">No folders yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* User Footer */}
            <div className="p-3 border-t border-zinc-800">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer relative">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {user?.photoURL && <img src={user.photoURL} alt="User" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-zinc-200 truncate">{user?.displayName || 'User'}</div>
                        <div className="text-xs text-zinc-600 truncate">Pro Plan</div>
                    </div>
                    <button onClick={() => logout()} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-all">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
