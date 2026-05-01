
import React from 'react';
import { marked } from 'marked';
import { Message, DyslexiaSettings } from '../types';
import { AssistantIcon, UserIcon, PlayIcon, PauseIcon, StopIcon, FileIcon, CopyIcon } from '../constants';
import { LoadingSpinner } from './LoadingSpinner';

// Override marked's default link renderer to open links in a new tab.
marked.use({
  renderer: {
    link(token) {
      // `token.tokens` can be undefined depending on how marked parsed the link.
      // `parseInline(undefined)` crashes inside marked by reading `.length`.
      const text = token.tokens ? this.parser.parseInline(token.tokens) : (token.text || token.href);
      const href = token.href;
      // Ensure title attribute is only added if it exists on the token
      const titleAttr = token.title ? `title="${token.title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr}>${text}</a>`;
    },
  },
});

interface MessageBubbleProps {
  message: Message;
  voiceURI: string | null;
  onRegenerate: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  dyslexiaSettings: DyslexiaSettings;
  onSpeak: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const sanitize = (htmlString: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    const scripts = temp.getElementsByTagName('script');
    while (scripts.length > 0) {
        scripts[0].parentNode?.removeChild(scripts[0]);
    }
    return temp.innerHTML;
}

export const MessageBubble: React.FC<MessageBubbleProps> = (props) => {
  try {
    const { 
        message, 
        voiceURI, 
        onRegenerate, 
        isLoading, 
        isSpeaking,
        isPaused,
        dyslexiaSettings,
        onSpeak,
        onPause,
        onResume,
        onStop
    } = props;
    const { role, content, imageUrl, attachmentName } = message;
    const isUser = role === 'user';
  
  const createMarkup = (text: string) => {
    const rawMarkup = marked.parse(text, { 
      gfm: true, 
      breaks: true, 
      async: false 
    });
    return { __html: sanitize(rawMarkup as string) };
  }

  const bubbleStyles = isUser
    ? 'bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)]'
    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]';

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        // Optional: Add a brief visual feedback if needed, 
        // but simple copy is usually enough.
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };

  return (
    <div className={`flex items-start gap-3 my-5 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="mt-1">
        {isUser ? <UserIcon /> : <AssistantIcon />}
      </div>
      <div
        className={`flex-1 max-w-[85%] sm:max-w-xl lg:max-w-2xl px-4 py-3 rounded-lg shadow-sm transition-colors ${bubbleStyles}`}
      >
        {isUser && attachmentName && (
            <div className="mb-2 overflow-hidden rounded-md border border-white/20 bg-white/10">
                <div className="p-2 bg-black/20 text-xs flex items-center gap-2 border-b border-white/10">
                    <FileIcon className="h-3 w-3" />
                    <span className="truncate font-medium">{attachmentName}</span>
                </div>
                {message.attachmentType === 'image' && message.imageUrl && (
                    <div className="p-1 bg-black/5">
                        <img 
                            src={message.imageUrl} 
                            alt={attachmentName} 
                            className="max-h-48 w-auto rounded object-contain mx-auto shadow-sm"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                )}
                {message.attachmentType === 'text' && attachmentName.toLowerCase().endsWith('.pdf') && (
                    <div className="p-4 flex flex-col items-center justify-center gap-2 bg-red-500/10">
                        <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-xs">PDF</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider opacity-60">Document Content Loaded</span>
                    </div>
                )}
                {message.attachmentType === 'text' && !attachmentName.toLowerCase().endsWith('.pdf') && (
                    <div className="p-4 flex flex-col items-center justify-center gap-2 bg-blue-500/10">
                        <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-xs">TXT</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider opacity-60">Text Content Loaded</span>
                    </div>
                )}
            </div>
        )}
        {!isUser && message.isLoading && !content && !imageUrl && (
            <div className="flex items-center gap-2 p-2 mb-2 animate-pulse">
                <LoadingSpinner />
                <span className="text-sm opacity-60">Thinking...</span>
            </div>
        )}
        <div className={`flex flex-col gap-4 ${!isUser && imageUrl ? 'md:flex-row-reverse md:items-start' : ''}`}>
            {!isUser && imageUrl && (
                <div className="w-full md:w-[40%] flex-shrink-0 animate-slide-in-up">
                    <img 
                        src={imageUrl} 
                        alt="Visual Aid" 
                        className="rounded-xl shadow-lg border border-[var(--border-color)] hover:scale-[1.02] transition-transform duration-300 w-full" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            const img = e.currentTarget;
                            // If already tried fallback, hide the image
                            if (img.dataset.fallback === '1') {
                                img.style.display = 'none';
                                return;
                            }
                            img.dataset.fallback = '1';
                            // Try Pollinations as fallback
                            const altText = img.alt || 'educational illustration';
                            img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(altText)}?width=512&height=512&nologo=true`;
                        }}
                    />
                </div>
            )}
            
            <div className="flex-1 min-w-0">
                {content && (
                    <>
                        <div 
                            className={`prose prose-sm sm:prose-base max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-strong:text-[var(--accent-color)] ${isUser ? '' : 'dark:prose-invert'}`} 
                            style={{ 
                                fontSize: `${dyslexiaSettings.fontSize}rem`,
                                lineHeight: dyslexiaSettings.lineSpacing,
                                letterSpacing: `${dyslexiaSettings.letterSpacing}em`,
                                wordSpacing: `${dyslexiaSettings.wordSpacing}em`,
                                color: isUser ? 'var(--user-bubble-text)' : 'inherit'
                            }}
                            dangerouslySetInnerHTML={createMarkup(content.replace(/\[SOURCES::[^\]]*\]/g, '').trim())} 
                        />
                        
                        {!isUser && (() => {
                            const sourcesMatch = content.match(/\[SOURCES::([^\]]*)\]/);
                            if (!sourcesMatch) return null;
                            const sourcesStr = sourcesMatch[1].trim();
                            const sources = sourcesStr.split('||').map(s => {
                                const parts = s.split('::');
                                return { name: parts[0]?.trim() || '', url: parts[1]?.trim() || '#', icon: parts[2]?.trim() || '🔗' };
                            }).filter(s => s.url && s.url !== '#' && s.name);

                            // Map source names to favicon images
                            const faviconMap: Record<string, string> = {
                                'Google Images': 'https://www.google.com/favicon.ico',
                                'YouTube': 'https://www.youtube.com/favicon.ico',
                                'Britannica': 'https://www.britannica.com/favicon.ico',
                                'Wikimedia': 'https://commons.wikimedia.org/static/favicon/commons.ico',
                            };

                            return (
                                <div className="mt-4 flex flex-wrap gap-2 animate-fadeInFast">
                                    {sources.map((source, idx) => (
                                        <a 
                                            key={idx}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-[var(--border-color)] text-xs font-medium transition-all hover:translate-y-[-1px] hover:shadow-sm"
                                        >
                                            {faviconMap[source.name] ? (
                                                <img 
                                                    src={faviconMap[source.name]} 
                                                    alt={source.name}
                                                    className="w-3.5 h-3.5 rounded-sm object-contain"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                                                />
                                            ) : (
                                                <span>{source.icon}</span>
                                            )}
                                            <span className="opacity-80">{source.name}</span>
                                            <span className="ml-1 opacity-40 text-[10px]">↗</span>
                                        </a>
                                    ))}
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </div>
      </div>
      
      {/* Action Buttons Column */}
      <div className="w-9 flex-shrink-0 self-center flex flex-col items-center gap-1">
        {!isUser && content && !message.isLoading && (
            <>
                <button 
                    onClick={handleCopy}
                    className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    aria-label="Copy message to clipboard"
                    title="Copy"
                >
                    <CopyIcon />
                </button>
                {isSpeaking ? (
                    <>
                        {isPaused ? (
                            <button 
                                onClick={onResume}
                                className="p-2 rounded-full text-[var(--accent-color)] hover:bg-[var(--bg-secondary)] transition-colors"
                                aria-label="Resume speech"
                                title="Resume"
                            >
                                <PlayIcon />
                            </button>
                        ) : (
                             <button 
                                onClick={onPause}
                                className="p-2 rounded-full text-[var(--accent-color)] hover:bg-[var(--bg-secondary)] transition-colors"
                                aria-label="Pause speech"
                                title="Pause"
                            >
                                <PauseIcon />
                            </button>
                        )}
                        <button 
                            onClick={onStop}
                            className="p-2 rounded-full text-red-500 hover:bg-[var(--bg-secondary)] transition-colors"
                            aria-label="Stop speech"
                            title="Stop"
                        >
                            <StopIcon />
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={onSpeak}
                        className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                        aria-label="Read message aloud"
                        title="Read aloud"
                    >
                        <PlayIcon />
                    </button>
                )}
            </>
        )}
      </div>
    </div>
  );
  } catch (e: any) {
    console.error("EXACT RENDER CRASH IN MESSAGEBUBBLE:", e.name, e.message, e.stack);
    return <div className="text-red-500">Component Crashed: {e.message}</div>;
  }
};
