import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import gsap from 'gsap';

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260322_013248_a74099a8-be2b-4164-a823-eddd5e149fa1.mp4';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

type ViewName = 'home' | 'upload' | 'ask';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

const navItems: Array<{ label: string; view: ViewName }> = [
  { label: 'HOME', view: 'home' },
  { label: 'UPLOAD', view: 'upload' },
  { label: 'ASK', view: 'ask' },
];

function App() {
  const videoBgRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<ViewName>('home');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocumentName, setUploadedDocumentName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Upload a document, then ask a question. I will answer from the indexed context.',
    },
  ]);

  const statusCopy = useMemo(() => {
    if (uploadStatus === 'uploading') {
      return 'Indexing document...';
    }

    if (uploadStatus === 'success') {
      return uploadMessage || 'Uploaded. You can ask questions now.';
    }

    if (uploadStatus === 'error') {
      return uploadMessage || 'Upload failed. Try again.';
    }

    return 'PDFs work best with the current backend parser.';
  }, [uploadMessage, uploadStatus]);

  useEffect(() => {
    const id = window.setTimeout(() => setIsReady(true), 80);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const videoBg = videoBgRef.current;

    if (!videoBg) {
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      targetX = ((event.clientX - cx) / cx) * 20;
      targetY = ((event.clientY - cy) / cy) * 20;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      gsap.set(videoBg, { x: currentX, y: currentY });
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const navigateTo = (nextView: ViewName) => {
    setView(nextView);
    setIsMenuOpen(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('error');
      setUploadMessage('Select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploadStatus('uploading');
    setUploadMessage('');

    try {
      const response = await axios.post<{ message: string }>(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus('success');
      setUploadMessage(response.data.message);
      setUploadedDocumentName(selectedFile.name);
      setView('ask');
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(getApiErrorMessage(error, 'Upload failed. Make sure the backend is running.'));
    }
  };

  const handleAsk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isAsking) {
      return;
    }

    setChatMessages((messages) => [
      ...messages,
      {
        id: Date.now(),
        role: 'user',
        content: trimmedQuestion,
      },
    ]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await axios.get<{ answer: string }>(`${API_BASE_URL}/ask`, {
        params: {
          query: trimmedQuestion,
        },
      });

      setChatMessages((messages) => [
        ...messages,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.answer,
        },
      ]);
    } catch (error) {
      setChatMessages((messages) => [
        ...messages,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: getApiErrorMessage(error, 'Could not reach the /ask endpoint. Is the backend running?'),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-black text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <CinematicBackdrop videoBgRef={videoBgRef} />

      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="text-[17px] font-semibold tracking-tight text-white"
          aria-label="Ragify home"
        >
          Ragify
          <sup className="ml-0.5 text-[8px] tracking-normal text-white/70">AI</sup>
        </button>

        <nav className="liquid-glass hidden items-center gap-1 rounded-full px-2 py-2 md:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigateTo(item.view)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] transition-colors duration-200 ${
                view === item.view ? 'bg-white/10 text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => navigateTo(view === 'ask' ? 'upload' : 'ask')}
          className="liquid-glass hidden rounded-full px-5 py-2.5 text-[11px] font-medium tracking-[0.12em] text-white/80 hover:text-white md:block"
        >
          {view === 'ask' ? 'UPLOAD' : 'ASK'}
        </button>

        <button
          type="button"
          className="liquid-glass relative z-50 rounded-full px-3 py-2 text-lg leading-none text-white md:hidden"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? '×' : '≡'}
        </button>
      </header>

      <MobileMenu isOpen={isMenuOpen} view={view} onNavigate={navigateTo} />

      <section className="relative z-20 min-h-screen px-5 pb-10 pt-28 sm:px-7 lg:px-10">
        <div
          className={`mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center justify-center transition-all duration-1000 ${
            isReady ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          {view === 'home' && <HomeView onNavigate={navigateTo} />}
          {view === 'upload' && (
            <UploadView
              fileInputRef={fileInputRef}
              selectedFile={selectedFile}
              status={uploadStatus}
              statusCopy={statusCopy}
              onFileChange={(file) => {
                setSelectedFile(file);
                setUploadStatus('idle');
                setUploadMessage('');
              }}
              onUpload={handleUpload}
            />
          )}
          {view === 'ask' && (
            <AskView
              messages={chatMessages}
              question={question}
              isAsking={isAsking}
              documentName={uploadedDocumentName}
              onQuestionChange={setQuestion}
              onAsk={handleAsk}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function CinematicBackdrop({ videoBgRef }: { videoBgRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <>
      <div
        ref={videoBgRef}
        className="fixed inset-0 z-0 scale-[1.08] origin-center"
        aria-hidden="true"
      >
        <video
          className="h-full w-full object-cover"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = 1.25;
          }}
        />
      </div>

      <div className="fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.1),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.3)_42%,rgba(0,0,0,0.82)_100%)]" />
    </>
  );
}

function MobileMenu({
  isOpen,
  view,
  onNavigate,
}: {
  isOpen: boolean;
  view: ViewName;
  onNavigate: (view: ViewName) => void;
}) {
  return (
    <div
      className={`!fixed left-4 right-4 top-[76px] z-40 origin-top rounded-[28px] px-4 py-4 transition-all duration-300 md:hidden ${
        isOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-3 scale-95 opacity-0'
      } liquid-glass`}
    >
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={`rounded-full px-4 py-3 text-left text-[11px] font-medium tracking-[0.12em] transition-colors duration-200 ${
              view === item.view ? 'bg-white/10 text-white' : 'text-white/80 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeView({ onNavigate }: { onNavigate: (view: ViewName) => void }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-white/60 sm:text-xs">
        PRIVATE RAG FOR EVERY FILE
      </p>
      <h1 className="max-w-5xl text-[clamp(40px,5.4vw,72px)] font-normal leading-[1.1] tracking-[-0.02em] text-white">
        Ask any document.
        <span className="block text-white/55">Get answers with receipts.</span>
      </h1>

      <p className="mt-60 max-w-[620px] text-[14px] leading-relaxed text-white sm:mt-56 sm:text-[15px]">
        Upload a file and Ragify turns it into a sharp, source-aware AI workspace.
        <span className="text-white/55">
          {' '}
          Ask questions instantly, trace every answer, and move from scattered pages to clear decisions.
        </span>
      </p>

      <div className="mt-7 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="rounded-full bg-white px-8 py-3.5 text-[15px] font-medium text-black transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_4px_rgba(255,255,255,0.2)] active:scale-[0.97]"
        >
          Chat with your first file
        </button>

        <div className="text-[11px] font-medium tracking-[0.14em] text-white/70">
          ENCRYPTED UPLOADS. SOURCE-TRACED ANSWERS.
        </div>
      </div>
    </div>
  );
}

function UploadView({
  fileInputRef,
  selectedFile,
  status,
  statusCopy,
  onFileChange,
  onUpload,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  statusCopy: string;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
}) {
  return (
    <div className="liquid-glass w-full max-w-3xl rounded-[40px] p-4 sm:p-6">
      <div
        className="group flex min-h-[480px] cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed border-white/20 bg-white/[0.025] px-6 py-12 text-center transition-all duration-300 hover:border-white/45 hover:bg-white/[0.045] sm:min-h-[560px]"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />

        <p className="mb-5 text-[11px] font-medium tracking-[0.28em] text-white/50">UPLOAD</p>
        <p className="max-w-xl text-[clamp(30px,5vw,54px)] font-normal leading-[1.05] tracking-[-0.03em] text-white">
          {selectedFile ? selectedFile.name : 'Choose a file to index'}
        </p>
        <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-white/50">
          {selectedFile ? `${formatBytes(selectedFile.size)} selected.` : 'Click the panel to select a document.'}
        </p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onUpload();
          }}
          disabled={status === 'uploading'}
          className="mt-10 rounded-full bg-white px-8 py-3 text-[14px] font-medium text-black transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_4px_rgba(255,255,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'uploading' ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      <div
        className={`mt-4 rounded-3xl px-5 py-4 text-center text-sm ${
          status === 'success'
            ? 'bg-emerald-400/10 text-emerald-100'
            : status === 'error'
              ? 'bg-red-400/10 text-red-100'
              : 'bg-white/[0.035] text-white/55'
        }`}
      >
        {statusCopy}
      </div>
    </div>
  );
}

function AskView({
  messages,
  question,
  isAsking,
  documentName,
  onQuestionChange,
  onAsk,
}: {
  messages: ChatMessage[];
  question: string;
  isAsking: boolean;
  documentName: string;
  onQuestionChange: (question: string) => void;
  onAsk: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="liquid-glass flex h-[min(78vh,760px)] min-h-[620px] w-full max-w-4xl flex-col rounded-[40px] p-4 sm:p-5">
      <div className="border-b border-white/10 px-2 pb-4 text-center">
        <p className="text-[11px] font-medium tracking-[0.28em] text-white/45">ASK</p>
        <p className="mt-2 truncate text-sm font-medium text-white">
          {documentName || 'No document uploaded yet'}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-1 py-5 sm:px-2">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-[24px] px-5 py-3 text-[14px] leading-relaxed ${
                message.role === 'user'
                  ? 'bg-white text-black'
                  : 'bg-white/[0.065] text-white/82 ring-1 ring-white/10'
              }`}
            >
              <FormattedMessage content={message.content} />
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex justify-start">
            <div className="rounded-[24px] bg-white/[0.065] px-5 py-3 text-[14px] text-white/70 ring-1 ring-white/10">
              Reading the document...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onAsk} className="flex items-center gap-3 rounded-full bg-white/[0.065] p-2 ring-1 ring-white/10">
        <input
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask about this document..."
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-white/35"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="rounded-full bg-white px-5 py-3 text-[13px] font-medium text-black transition-all duration-300 hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const blocks = formatAssistantContent(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkup(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'math') {
          return (
            <div
              key={index}
              className="overflow-x-auto rounded-2xl bg-black/25 px-4 py-3 font-mono text-[13px] leading-relaxed text-current"
            >
              {block.content}
            </div>
          );
        }

        return <p key={index}>{renderInlineMarkup(block.content)}</p>;
      })}
    </div>
  );
}

function formatAssistantContent(content: string) {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\$\$([\s\S]*?)\$\$/g, '\n$$$1$$\n')
    .replace(/\s+\*\s+/g, '\n* ')
    .replace(/\s+-\s+/g, '\n- ')
    .replace(/\s+(Where:|Key points:|Answer:|In short:)/g, '\n\n$1');

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: Array<{ type: 'paragraph' | 'math'; content: string } | { type: 'list'; items: string[] }> = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  lines.forEach((line) => {
    if (/^[-*]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*]\s+/, ''));
      return;
    }

    flushList();

    if (line.startsWith('$$') && line.endsWith('$$')) {
      blocks.push({ type: 'math', content: line.replace(/^\$\$|\$\$$/g, '').trim() });
      return;
    }

    blocks.push({ type: 'paragraph', content: line });
  });

  flushList();

  return blocks.length ? blocks : [{ type: 'paragraph' as const, content }];
}

function renderInlineMarkup(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail) && detail[0]?.msg) {
      return detail[0].msg;
    }

    if (error.message) {
      return error.message;
    }
  }

  return fallback;
}

export default App;
