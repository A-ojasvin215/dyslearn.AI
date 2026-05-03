
import React, { useState, useMemo } from 'react';
import type { ChatMetadata, Challenge, UserData, ImageProvider } from '../types';
import { NewChatIcon, CloseIcon, MessageIcon, TrashIcon, TrophyIcon, ChartBarIcon, LightBulbIcon, DinoIcon, BirdIcon, TetrisIcon, CHALLENGES } from '../constants';
import { ProgressView } from './ProgressView';
import { ConceptExplainer } from './ConceptExplainer';
import { StudiesView, type StudiesQuizSession } from './StudiesView';
const DinoGame = React.lazy(() => import('./DinoGame').then(m => ({ default: m.DinoGame })));
const FlappyBird = React.lazy(() => import('./FlappyBird').then(m => ({ default: m.FlappyBird })));
const Tetris = React.lazy(() => import('./Tetris').then(m => ({ default: m.Tetris })));

const CHATS_PER_PAGE = 15;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMetadata[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSwitchChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onStartChallenge: (challenge: Challenge) => void;
  onExplainConcept: (concept: string) => void;
  userData: UserData;
  isLoading: boolean;
  selectedImageProvider: ImageProvider;
  onImageProviderChange: (provider: ImageProvider) => void;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  onGamePlayed: () => void;
  onStartStudiesQuiz: (session: StudiesQuizSession) => void;
}

const ChallengeList: React.FC<{ onStartChallenge: (challenge: Challenge) => void }> = ({ onStartChallenge }) => (
    <div className="p-2 space-y-2">
        <p className="px-2 text-xs text-[var(--text-secondary)]">Select a challenge to begin.</p>
        {CHALLENGES.map(challenge => (
            <button 
                key={challenge.id}
                onClick={() => onStartChallenge(challenge)}
                className="w-full text-left p-3 rounded-lg bg-[var(--bg-primary)] hover:bg-opacity-80 border border-[var(--border-color)] shadow-sm group transition-all"
            >
                <div className="flex items-center gap-3">
                    <challenge.icon className="h-8 w-8 text-[var(--accent-color)] flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{challenge.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">{challenge.description}</p>
                    </div>
                </div>
            </button>
        ))}
    </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chatHistory,
  activeChatId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onStartChallenge,
  onExplainConcept,
  userData,
  isLoading,
  selectedImageProvider,
  onImageProviderChange,
  selectedImageModel,
  onImageModelChange,
  onGamePlayed,
  onStartStudiesQuiz,
}) => {
    const [view, setView] = useState<'history' | 'challenges' | 'progress' | 'explain' | 'arcade' | 'studies'>('history');
    const [arcadeGame, setArcadeGame] = useState<'dino' | 'flappy' | 'tetris'>('dino');
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleChatsCount, setVisibleChatsCount] = useState(CHATS_PER_PAGE);
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setChatToDelete(id);
    };

    const confirmDelete = () => {
        if (chatToDelete) {
            onDeleteChat(chatToDelete);
            setChatToDelete(null);
        }
    };

    const handleStartChallenge = (challenge: Challenge) => {
        onStartChallenge(challenge);
        setView('history'); // Switch back to history to see the new chat
    };

    const handleExplain = (concept: string) => {
        onExplainConcept(concept);
        setView('history');
    };

    const sortedChats = [...chatHistory].sort((a, b) => {
        const aTime = a.createdAt || parseInt(a.id?.match(/(\d{10,})/)?.[1] || '0');
        const bTime = b.createdAt || parseInt(b.id?.match(/(\d{10,})/)?.[1] || '0');
        return bTime - aTime;
    });
    const visibleChats = sortedChats.slice(0, visibleChatsCount);
    const hasMoreChats = sortedChats.length > visibleChatsCount;

    const handleLoadMore = () => {
        setVisibleChatsCount(prev => prev + CHATS_PER_PAGE);
    };

    // Group chats by date
    const groupedChats = useMemo(() => {
        const now = Date.now();
        const DAY = 86400000;
        const groups: { label: string; chats: ChatMetadata[] }[] = [
            { label: 'Today', chats: [] },
            { label: 'Yesterday', chats: [] },
            { label: 'This Week', chats: [] },
            { label: 'Older', chats: [] },
        ];
        visibleChats.forEach(chat => {
            const age = now - (chat.createdAt || 0);
            if (age < DAY) groups[0].chats.push(chat);
            else if (age < 2 * DAY) groups[1].chats.push(chat);
            else if (age < 7 * DAY) groups[2].chats.push(chat);
            else groups[3].chats.push(chat);
        });
        return groups.filter(g => g.chats.length > 0);
    }, [visibleChats]);

    // Get icon for a chat (challenge icon or default message icon)
    const getChatIcon = (chat: ChatMetadata) => {
        if (chat.challengeId) {
            const challenge = CHALLENGES.find(c => c.id === chat.challengeId);
            if (challenge) return <challenge.icon className="h-4 w-4 flex-shrink-0 text-[var(--accent-color)]" />;
        }
        return <MessageIcon className="h-4 w-4 flex-shrink-0" />;
    };    
    return (
    <>
        {/* Overlay for mobile */}
        <div 
            className={`fixed inset-0 bg-black/30 z-20 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        <aside className={`absolute md:static top-0 left-0 h-full w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] text-[var(--text-secondary)] flex flex-col transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-[var(--border-color)] flex-shrink-0">
                <button onClick={onNewChat} aria-label="Start a new chat" className="flex items-center gap-2 p-2 rounded-lg text-sm font-semibold text-left text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors">
                    <NewChatIcon />
                    <span>New Chat</span>
                </button>
                <button onClick={onClose} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] md:hidden" aria-label="Close menu">
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
             {/* View Toggler */}
            <div className="p-2 border-b border-[var(--border-color)]">
                <div className="flex bg-[var(--bg-primary)] rounded-lg p-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setView('history')} aria-label="View Chat History" className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${view === 'history' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        <MessageIcon className="h-3.5 w-3.5" /> History
                    </button>
                    <button onClick={() => setView('challenges')} aria-label="View Challenges" className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${view === 'challenges' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        <TrophyIcon className="h-3.5 w-3.5" /> Games
                    </button>
                    <button onClick={() => setView('arcade')} aria-label="Play Arcade Games" className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${view === 'arcade' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        <DinoIcon className="h-3.5 w-3.5" /> Arcade
                    </button>
                    <button onClick={() => setView('progress')} aria-label="View Progress" className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${view === 'progress' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        <ChartBarIcon className="h-3.5 w-3.5" /> Stats
                    </button>
                    <button onClick={() => setView('studies')} aria-label="Study Indian Curriculum" className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${view === 'studies' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                        📚 Studies
                    </button>
                </div>
            </div>
            {/* Content */}
            <nav className="flex-1 overflow-y-auto">
                {view === 'history' ? (
                    <div className="p-2 space-y-3">
                        {groupedChats.map(group => (
                            <div key={group.label}>
                                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
                                    {group.label}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.chats.map((chat) => (
                                        <li key={chat.id} className="group relative">
                                            <button
                                                onClick={() => onSwitchChat(chat.id)}
                                                aria-label={`Switch to chat: ${chat.title}`}
                                                className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors w-full text-left ${
                                                    activeChatId === chat.id
                                                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] font-semibold shadow-sm'
                                                        : 'hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                                                }`}
                                            >
                                                {getChatIcon(chat)}
                                                <span className="flex-1 truncate pr-7 text-xs">{chat.title}</span>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteClick(e, chat.id)}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-opacity focus:opacity-100"
                                                aria-label={`Delete chat: ${chat.title}`}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        {chatHistory.length === 0 && (
                            <p className="text-xs text-center text-[var(--text-secondary)] opacity-50 py-8">No chats yet. Start a conversation!</p>
                        )}
                        {hasMoreChats && (
                            <button
                                onClick={handleLoadMore}
                                className="w-full py-2 text-xs font-bold text-[var(--accent-color)] hover:underline transition-all"
                            >
                                Load more chats...
                            </button>
                        )}
                    </div>
                ) : view === 'challenges' ? (
                    <ChallengeList onStartChallenge={handleStartChallenge} />
                ) : view === 'arcade' ? (
                    <div className="p-4 space-y-4">
                        <div className="flex gap-2 p-1 bg-[var(--bg-primary)] rounded-lg">
                            <button 
                                onClick={() => setArcadeGame('dino')}
                                className={`flex-1 flex flex-col items-center p-2 rounded-md transition-colors ${arcadeGame === 'dino' ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-secondary)]'}`}
                            >
                                <DinoIcon className="h-5 w-5" />
                                <span className="text-[10px] mt-1">Dino</span>
                            </button>
                            <button 
                                onClick={() => setArcadeGame('flappy')}
                                className={`flex-1 flex flex-col items-center p-2 rounded-md transition-colors ${arcadeGame === 'flappy' ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-secondary)]'}`}
                            >
                                <BirdIcon className="h-5 w-5" />
                                <span className="text-[10px] mt-1">Flappy</span>
                            </button>
                            <button 
                                onClick={() => setArcadeGame('tetris')}
                                className={`flex-1 flex flex-col items-center p-2 rounded-md transition-colors ${arcadeGame === 'tetris' ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-secondary)]'}`}
                            >
                                <TetrisIcon className="h-5 w-5" />
                                <span className="text-[10px] mt-1">Tetris</span>
                            </button>
                        </div>
                        
                        <div className="mt-4">
                            {!isExpanded && (
                                <React.Suspense fallback={<div className="flex items-center justify-center p-8 bg-[var(--bg-primary)] rounded-lg border border-dashed border-[var(--border-color)] text-[var(--text-secondary)] text-xs">Loading game...</div>}>
                                    {arcadeGame === 'dino' && <DinoGame onGameOver={() => onGamePlayed()} onToggleExpand={() => setIsExpanded(true)} />}
                                    {arcadeGame === 'flappy' && <FlappyBird onGameOver={() => onGamePlayed()} onToggleExpand={() => setIsExpanded(true)} />}
                                    {arcadeGame === 'tetris' && <Tetris onGameOver={() => onGamePlayed()} onToggleExpand={() => setIsExpanded(true)} />}
                                </React.Suspense>
                            )}
                        </div>
                    </div>
                ) : view === 'studies' ? (
                    <StudiesView onStartQuiz={(session) => { onStartStudiesQuiz(session); setView('history'); }} />
                ) : (
                    <ProgressView userData={userData} onStartChallenge={handleStartChallenge} />
                )}            </nav>

            {/* Delete Confirmation Modal */}
            {chatToDelete && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] shadow-xl w-full max-w-[240px] animate-fade-in">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Delete Chat?</h3>
                        <p className="text-xs text-[var(--text-secondary)] mb-4">This action cannot be undone.</p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setChatToDelete(null)}
                                className="flex-1 py-2 text-xs font-bold rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Game Overlay */}
            {isExpanded && (
                <div className="absolute inset-0 bg-[var(--bg-secondary)] z-50 flex flex-col">
                    <div className="p-2 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color)]">
                            {arcadeGame} Mode
                        </span>
                        <button 
                            onClick={() => setIsExpanded(false)}
                            className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
                            aria-label="Exit Full Screen"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        <div className="w-full max-w-sm">
                            <React.Suspense fallback={<div className="text-[var(--text-secondary)] font-bold">LOADING ARCADIA...</div>}>
                                {arcadeGame === 'dino' && <DinoGame onGameOver={() => onGamePlayed()} onToggleExpand={() => setIsExpanded(false)} />}
                                {arcadeGame === 'flappy' && <FlappyBird onGameOver={() => onGamePlayed()} onToggleExpand={() => setIsExpanded(false)} />}
                                {arcadeGame === 'tetris' && <Tetris onGameOver={() => onGamePlayed()} onToggleExpand={() => setIsExpanded(false)} />}
                            </React.Suspense>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    </>
    );
};

