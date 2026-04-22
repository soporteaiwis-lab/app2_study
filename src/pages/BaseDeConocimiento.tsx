import React, { useState, useEffect, useRef } from "react";
import { DriveFile, getStudyFiles, getFileDownloadUrl } from "../services/driveService";
import { extractTextFromPdfUrl } from "../services/pdfService";
import { askGeminiAboutSources, generateStudioContent, generateSuggestedQuestions, ChatMessage } from "../services/geminiService";
import { 
  FileText, Loader2, AlertCircle, Send, Bot, User as UserIcon, 
  Upload, Cloud, MonitorUp, CheckSquare, Square, Download, 
  FileCheck, NotebookPen, FileQuestion, Sparkles, BrainCircuit,
  Infinity as InfinityIcon, Moon, Sun, Printer
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

type SourceItem = {
  id: string;
  type: 'drive' | 'local';
  name: string;
  mimeType: string;
  data: any;
  extractedText?: string;
  isExtracting?: boolean;
  error?: string;
};

// Butterfly SVG Decoration
const ButterflyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.5c-1.5 0-2.5 1-2.5 2.5 0 2 .5 3.5 1.5 5-2-1.5-4-2.5-6-2.5-2.5 0-3.5 1.5-3.5 3s2.5 4 4.5 4c2.5 0 4.5 1 5.5 1.5-1-1.5-1.5-3.5-1.5-6 1-1.5 1.5-3.5 1.5-5 0-1.5-1-2.5-2.5-2.5z" />
    <path d="M12 2.5c1.5 0 2.5 1 2.5 2.5 0 2-.5 3.5-1.5 5 2-1.5 4-2.5 6-2.5 2.5 0 3.5 1.5 3.5 3s-2.5 4-4.5 4c-2.5 0-4.5 1-5.5 1.5 1-1.5 1.5-3.5 1.5-6-1-1.5-1.5-3.5-1.5-5 0-1.5 1-2.5 2.5-2.5z" />
    <path d="M12 20v-8" />
  </svg>
);

export default function BaseDeConocimiento() {
  const { user } = useAuth();
  
  // Theming & UI
  const [isDark, setIsDark] = useState(false);
  
  // Archivos y Selección
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingDrive, setLoadingDrive] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Sugerencias
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Nuevo modal
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [activeMemoryTab, setActiveMemoryTab] = useState<string | null>(null);

  // Studio (Generador)
  const [studioResult, setStudioResult] = useState<{type: string, content: string} | null>(null);
  const [isGeneratingStudio, setIsGeneratingStudio] = useState(false);
  const [enableSuggestions, setEnableSuggestions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PERSISTENCE: Cargar mensajes e IDs al iniciar
  useEffect(() => {
    const savedMessages = localStorage.getItem('gilda_messages');
    const savedIds = localStorage.getItem('gilda_selectedIds');
    const savedTheme = localStorage.getItem('gilda_theme');
    
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedIds) setSelectedIds(new Set(JSON.parse(savedIds)));
    if (savedTheme === 'dark') setIsDark(true);

    fetchDriveFiles();
  }, []);

  // PERSISTENCE: Guardar mensajes e IDs al cambiar
  useEffect(() => {
    localStorage.setItem('gilda_messages', JSON.stringify(messages));
    localStorage.setItem('gilda_selectedIds', JSON.stringify(Array.from(selectedIds)));
  }, [messages, selectedIds]);

  useEffect(() => {
    localStorage.setItem('gilda_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, suggestedQuestions]);

  const fetchDriveFiles = async () => {
    setLoadingDrive(true);
    setGlobalError(null);
    try {
      const data = await getStudyFiles();
      const mapped = data.map(f => ({ 
        type: 'drive' as const, 
        id: f.id, 
        name: f.name, 
        mimeType: f.mimeType, 
        data: f 
      }));
      setSources(prev => {
        const locals = prev.filter(s => s.type === 'local');
        const merged = [...locals, ...mapped];
        
        // Auto-extraer si había seleccionados guardados de la sesión anterior
        savedExtractionCheck(merged, new Set(JSON.parse(localStorage.getItem('gilda_selectedIds') || "[]")));
        return merged;
      });
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setLoadingDrive(false);
    }
  };

  const savedExtractionCheck = (currentSources: SourceItem[], savedSelected: Set<string>) => {
    let triggeredAny = false;
    currentSources.forEach(s => {
      if (savedSelected.has(s.id) && !s.extractedText && !s.isExtracting) {
        triggeredAny = true;
        extractSourceContent(s.id, currentSources);
      }
    });
  };

  const processSuggestions = async (context: string) => {
    if (!enableSuggestions) {
      setSuggestedQuestions([]);
      return;
    }
    setIsGeneratingQuestions(true);
    setSuggestedQuestions([]);
    const qs = await generateSuggestedQuestions(context);
    setSuggestedQuestions(qs);
    setIsGeneratingQuestions(false);
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        type: 'local' as const,
        id: `local-${Date.now()}-${file.name}`,
        name: file.name,
        mimeType: file.type,
        data: file
      }));
      setSources(prev => [...prev, ...newFiles]);
    }
  };

  const extractSourceContent = async (sourceId: string, currentSources: SourceItem[]) => {
    setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isExtracting: true } : s));
    
    // Using a temporary hack to get the source, ideally we'd pass it directly but we need latest state
    const source = currentSources.find(s => s.id === sourceId) || sources.find(s => s.id === sourceId);
    if(!source) return;

    try {
      let text = "";
      const isPdf = source.mimeType === 'application/pdf' || source.name.toLowerCase().endsWith('.pdf');
      const isDoc = source.mimeType === 'application/vnd.google-apps.document' || source.name.toLowerCase().endsWith('.txt');

      if (source.type === 'drive') {
        if (isPdf) {
          const url = await getFileDownloadUrl(source.data.id, source.mimeType);
          text = await extractTextFromPdfUrl(url);
        } else if (isDoc) {
          const url = await getFileDownloadUrl(source.data.id, source.mimeType);
          const response = await fetch(url);
          if(!response.ok) throw new Error("Fallo descargando texto.");
          text = await response.text();
        } else {
           text = `[Archivo de Drive: ${source.name}]\nFormato secundario. Se detecta el archivo en la carpeta.`;
        }
      } else {
        const file = source.data;
        if (file.type === 'application/pdf') {
          const url = URL.createObjectURL(file);
          text = await extractTextFromPdfUrl(url);
        } else if (file.type === 'text/plain') {
          text = await file.text();
        } else {
          text = `[Archivo Local: ${source.name}]\nContenido multimedia o formato cerrado.`;
        }
      }
      setSources(prev => {
        const updated = prev.map(s => s.id === sourceId ? { ...s, isExtracting: false, extractedText: text } : s);
        // After extraction, try generating suggestions based on the newly formed context
        const newSelectedData = updated.filter(s => selectedIds.has(s.id) || s.id === sourceId);
        const combined = newSelectedData.map(s => s.extractedText).filter(t => t && t.length > 50).join('\n=== SIGUIENTE FUENTE ===\n');
        if (combined.trim().length > 100) {
          processSuggestions(combined);
        } else {
          setSuggestedQuestions(["¿De qué trata este documento?", "¿Cuáles son los conceptos clave?", "¿Puedes darme un resumen?"]);
        }
        return updated;
      });
    } catch (err: any) {
       setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isExtracting: false, error: err.message } : s));
    }
  }

  const toggleSourceSelection = async (sourceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId);
      setSelectedIds(newSelected);
      setSuggestedQuestions([]); // Clear suggestions if removing
      return;
    }

    newSelected.add(sourceId);
    setSelectedIds(newSelected);

    // Context updating
    const source = sources.find(s => s.id === sourceId);
    if (source && !source.extractedText && !source.isExtracting) {
      extractSourceContent(sourceId, sources);
    } else {
      // Re-generate suggestions if already extracted
      const combined = sources.filter(s => newSelected.has(s.id)).map(s => s.extractedText).filter(t => t && t.length > 50).join('\n=== SIGUIENTE FUENTE ===\n');
      if (combined.trim().length > 100) {
        processSuggestions(combined);
      } else if (newSelected.size > 0) {
        setSuggestedQuestions(["¿De qué trata este documento?", "¿Cuáles son los conceptos clave?", "¿Puedes darme un resumen?"]);
      }
    }
  };

  const getCombinedContextText = () => {
    const selectedSourcesData = sources.filter(s => selectedIds.has(s.id));
    if (selectedSourcesData.length === 0) return "";
    return selectedSourcesData
      .map(s => `=== FUENTE: ${s.name} ===\n${s.extractedText || '[Pendiente o sin texto]'}`)
      .join('\n\n');
  };

  const handleSendSpecificMessage = async (msg: string) => {
    if (!msg || isThinking || selectedIds.size === 0) return;

    setChatInput("");
    setSuggestedQuestions([]);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsThinking(true);

    try {
      const combinedContext = getCombinedContextText();
      const responseText = await askGeminiAboutSources(msg, combinedContext, messages);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `❌ Hubo un error: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSendSpecificMessage(chatInput.trim());
  };

  const handleGenerateStudio = async (type: 'resumen' | 'cuestionario' | 'tips' | 'analisis') => {
    if (selectedIds.size === 0) {
      alert("Por favor selecciona al menos una fuente para generar contenido.");
      return;
    }
    setIsGeneratingStudio(true);
    setStudioResult(null);
    try {
      const combinedContext = getCombinedContextText();
      const result = await generateStudioContent(type, combinedContext);
      setStudioResult({ type, content: result });
    } catch (error: any) {
       alert(error.message);
    } finally {
      setIsGeneratingStudio(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!studioResult) return;
    
    // Construct HTML for Printing/PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Permite las ventanas emergentes para descargar el PDF/Word.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gilda Study - ${studioResult.type}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; padding: 40px; color: #333; max-width: 800px; margin: auto; }
          h1 { color: #4F46E5; border-bottom: 2px solid #E0E7FF; padding-bottom: 10px; display:flex; align-items:center; }
          .logo { margin-right: 10px; width: 30px; height: 30px; }
          pre { background: #f8fafc; padding: 20px; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 15px;}
          .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Generado por Gilda Study IA</h1>
        <p><strong>Recurso:</strong> ${studioResult.type.toUpperCase()}</p>
        <pre>${studioResult.content}</pre>
        <div class="footer">Este documento fue generado dinámicamente según tus fuentes de estudio.</div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const hasSelectedSources = selectedIds.size > 0;
  const isAnySelectedExtracting = sources.filter(s => selectedIds.has(s.id)).some(s => s.isExtracting);

  // Dynamic Theme Classes
  const themeClasses = {
    bg: isDark ? 'bg-slate-900' : 'bg-gray-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    header: isDark ? 'bg-slate-800/80' : 'bg-gray-50/80',
    textMain: isDark ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    chatUser: isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white',
    chatModel: isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-100 text-gray-800 shadow-sm',
    inputBg: isDark ? 'bg-slate-700 focus:bg-slate-600 text-white border-slate-600' : 'bg-gray-100 focus:bg-white text-gray-900 border-transparent',
    suggestBtn: isDark ? 'bg-slate-700 text-indigo-300 hover:bg-slate-600 border-slate-600' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100'
  };

  return (
    <div className={`flex flex-col h-auto lg:h-[calc(100vh-6rem)] -mt-2 transition-colors duration-500 ${themeClasses.bg} p-2 sm:p-4 rounded-xl relative overflow-hidden`}>
      
      {/* Background Decorations */}
      <div className="absolute top-10 left-10 text-indigo-500/10 pointer-events-none">
        <InfinityIcon size={250} />
      </div>
      <div className="absolute bottom-10 right-10 text-pink-500/10 pointer-events-none">
        <ButterflyIcon className="w-64 h-64" />
      </div>

      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between relative z-10 p-2">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${themeClasses.textMain} flex items-center gap-2`}>
            Estudio RAG Multifuente <Sparkles className="text-yellow-400" size={20} />
          </h1>
          <div className="flex items-center gap-3 mt-1">
             <p className={`text-sm ${themeClasses.textMuted}`}>Analiza tus recursos como un experto.</p>
             <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
               <span className={`text-[11px] font-bold ${enableSuggestions ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>Sugerencias IA</span>
               <button 
                 onClick={() => setEnableSuggestions(!enableSuggestions)}
                 className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${enableSuggestions ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
               >
                 <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enableSuggestions ? 'translate-x-4' : 'translate-x-1'}`} />
               </button>
             </div>
          </div>
        </div>
        
        {/* Actions / Theme Toggle */}
        <div className="flex gap-2">
           <button onClick={() => setShowMemoryModal(true)} disabled={selectedIds.size === 0} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>Ver Memoria Extraída</button>
           <button onClick={() => setMessages([])} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}>Limpiar Chat</button>
           <button 
             onClick={() => setIsDark(!isDark)} 
             className={`p-2 rounded-full transition-colors ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-200 text-slate-700'}`}
             title="Cambiar Skin (Modo Oscuro/Claro)"
           >
             {isDark ? <Sun size={20} /> : <Moon size={20} />}
           </button>
        </div>
      </div>

      {globalError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 shrink-0 text-sm relative z-10 mx-2">
          <AlertCircle size={18} />
          <p>{globalError}</p>
        </div>
      )}

      {/* Grid estilo NotebookLM (3 columnas) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative z-10 w-full max-w-full pb-20 md:pb-0">
        
        {/* PANEL IZQUIERDO: FUENTES */}
        <div className={`w-full lg:w-[25%] ${themeClasses.card} rounded-2xl shadow-lg border flex flex-col min-h-[350px] lg:min-h-[250px] transition-colors overflow-hidden shrink-0`}>
          <div className={`p-4 border-b flex items-center justify-between ${themeClasses.header} ${isDark?'border-slate-700':'border-gray-100'} shrink-0`}>
            <h2 className={`font-semibold ${themeClasses.textMain} flex items-center gap-2`}>
              <FileCheck size={18} className={isDark ? "text-indigo-400" : "text-indigo-600"} />
              Tus Fuentes
            </h2>
            <div className="flex gap-1">
              <button onClick={fetchDriveFiles} className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-gray-400 hover:text-indigo-400 hover:bg-slate-700' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title="Sincronizar Google Drive">
                 <Cloud size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingDrive && sources.length === 0 ? (
              <div className="flex justify-center p-8 text-indigo-500"><Loader2 className="animate-spin" size={24} /></div>
            ) : sources.length === 0 ? (
              <p className={`text-xs text-center p-4 ${themeClasses.textMuted}`}>No hay fuentes disponibles.</p>
            ) : (
              sources.map(source => {
                const isSelected = selectedIds.has(source.id);
                return (
                  <div key={source.id} 
                    className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? isDark ? "border-indigo-500 bg-indigo-500/20" : "border-indigo-400 bg-indigo-50/50 shadow-sm" 
                        : isDark ? "border-slate-700 hover:border-slate-600 hover:bg-slate-700/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => toggleSourceSelection(source.id)}
                  >
                    <div className={`mt-0.5 shrink-0 transition-colors ${isSelected ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : themeClasses.textMuted}`}>
                       {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm font-medium line-clamp-2 ${isSelected ? themeClasses.textMain : themeClasses.textMuted}`}>
                        {source.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {source.type === 'drive' ? <Cloud size={12} className={isDark ? "text-cyan-400" : "text-cyan-500"}/> : <MonitorUp size={12} className={isDark ? "text-emerald-400" : "text-emerald-500"}/>}
                        {source.isExtracting ? (
                          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Leyendo...</span>
                        ) : source.extractedText ? (
                          <span className="text-[10px] text-emerald-500 font-bold tracking-wide">LISTA</span>
                        ) : source.error ? (
                          <span className="text-[10px] text-red-500 truncate" title={source.error}>Error</span>
                        ) : (
                           <span className="text-[10px] opacity-60">Sin analizar</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'} shrink-0`}>
             <input type="file" multiple ref={fileInputRef} onChange={handleLocalUpload} className="hidden" accept=".pdf,.txt,.doc,.docx" />
             <button onClick={() => fileInputRef.current?.click()} className={`w-full flex items-center justify-center gap-2 py-3 border border-dashed rounded-xl text-sm font-medium transition-colors ${isDark ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
               <Upload size={16} /> Carga Local Rapida
             </button>
             <p className={`mt-2 text-[10px] text-center ${themeClasses.textMuted}`}>Las cargas locales desaparecen al refrescar. Para almacenar perenemente, súbelas a Drive.</p>
          </div>
        </div>

        {/* PANEL CENTRAL: CHAT CONSTANTE */}
        <div className={`w-full lg:w-[45%] ${themeClasses.card} rounded-2xl shadow-lg border flex flex-col min-h-[500px] lg:min-h-[400px] transition-colors shrink-0 lg:shrink`}>
          <div className={`p-4 border-b flex items-center gap-2 ${themeClasses.header} ${isDark?'border-slate-700':'border-gray-100'} rounded-t-2xl shrink-0`}>
             <Bot size={20} className={isDark ? "text-pink-400" : "text-pink-500"} />
             <h2 className={`font-semibold ${themeClasses.textMain}`}>Investigación</h2>
             <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
               {selectedIds.size} conectadas
             </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 shrink">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center px-6">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${isDark ? 'bg-slate-700 text-pink-400' : 'bg-pink-50 text-pink-500'}`}>
                   <InfinityIcon size={40} className="animate-pulse" />
                 </div>
                 <h3 className={`text-xl font-bold mb-2 ${themeClasses.textMain}`}>IA de Interacción</h3>
                 <p className={`text-sm max-w-sm ${themeClasses.textMuted}`}>Selecciona fuentes y conversemos. Yo conectaré los puntos, cruzaré la información y te daré respuestas precisas.</p>
               </div>
            ) : (
               messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${msg.role === 'user' ? (isDark ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700') : 'bg-gradient-to-br from-pink-500 to-orange-400 text-white'}`}>
                    {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? themeClasses.chatUser + ' rounded-tr-none' : themeClasses.chatModel + ' rounded-tl-none'}`}>
                    {/* CRITICAL FIX: Ensure actual text color is explicitly defined */}
                    <p className={`whitespace-pre-wrap m-0 leading-relaxed font-sans text-[15px] ${msg.role === 'user' ? 'text-white' : (isDark ? 'text-gray-100' : 'text-gray-900')}`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {isThinking && (
              <div className="flex gap-3 fade-in">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white flex items-center justify-center shadow-md">
                  <Bot size={14} />
                </div>
                <div className={`${themeClasses.chatModel} rounded-2xl rounded-tl-none px-6 py-5 flex items-center gap-2 min-w-[80px]`}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input & Suggestions */}
          <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'} shrink-0 rounded-b-2xl flex flex-col gap-3`}>
             
             {/* Suggested Questions */}
             {suggestedQuestions.length > 0 && !isThinking && (
               <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 hide-scrollbar">
                 {suggestedQuestions.map((q, i) => (
                   <button 
                     key={i} 
                     onClick={() => handleSendSpecificMessage(q)}
                     className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border shadow-sm ${themeClasses.suggestBtn}`}
                   >
                     {q}
                   </button>
                 ))}
               </div>
             )}
             {isGeneratingQuestions && (
               <div className="flex gap-2 items-center px-2 py-1">
                 <Loader2 size={12} className="animate-spin text-gray-400" />
                 <span className="text-xs text-gray-400">Generando sugerencias...</span>
               </div>
             )}

             <form onSubmit={handleSendMessage} className="relative flex items-center">
               <input
                 type="text"
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 placeholder={hasSelectedSources ? (isAnySelectedExtracting ? "Gilda está leyendo los pdfs..." : "Hazme una pregunta sobre tus fuentes...") : "Selecciona una fuente a la izquierda primero..."}
                 disabled={isThinking || !hasSelectedSources || isAnySelectedExtracting}
                 className={`w-full pl-6 pr-14 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all disabled:opacity-60 text-sm border ${themeClasses.inputBg}`}
               />
               <button
                 type="submit"
                 disabled={!chatInput.trim() || isThinking || !hasSelectedSources || isAnySelectedExtracting}
                 className="absolute right-2 p-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:grayscale transition-all shadow-md"
               >
                 <Send size={18} className="translate-x-0.5" />
               </button>
             </form>
          </div>
        </div>

        {/* PANEL DERECHO: ESTUDIO (STUDIO) */}
        <div className={`w-full lg:w-[30%] ${themeClasses.card} rounded-2xl shadow-lg border flex flex-col min-h-[250px] transition-colors`}>
          <div className={`p-4 border-b ${themeClasses.header} ${isDark ? 'border-slate-700' : 'border-gray-100'} rounded-t-2xl shrink-0`}>
             <h2 className={`font-semibold ${themeClasses.textMain} flex items-center gap-2`}>
               <BrainCircuit size={18} className={isDark ? "text-cyan-400" : "text-cyan-600"} />
               Generador Studio
             </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
             {!studioResult && !isGeneratingStudio && (
               <>
                 <p className={`text-xs text-center px-2 mb-2 ${themeClasses.textMuted}`}>Transforma tus múltiples fuentes en recursos didácticos de un clic.</p>
                 <div className="grid grid-cols-1 gap-3">
                   <button onClick={() => handleGenerateStudio('resumen')} disabled={!hasSelectedSources} className={`flex items-center gap-3 p-4 rounded-xl border transition-all disabled:opacity-50 text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-gray-200 hover:border-pink-400 hover:bg-slate-600' : 'bg-white border-gray-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50 hover:shadow-sm'}`}>
                     <FileText size={20} className="text-pink-500" /> Resumen Ejecutivo
                   </button>
                   <button onClick={() => handleGenerateStudio('cuestionario')} disabled={!hasSelectedSources} className={`flex items-center gap-3 p-4 rounded-xl border transition-all disabled:opacity-50 text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-gray-200 hover:border-cyan-400 hover:bg-slate-600' : 'bg-white border-gray-200 text-gray-700 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-sm'}`}>
                     <FileQuestion size={20} className="text-cyan-500" /> Cuestionario FAQ
                   </button>
                   <button onClick={() => handleGenerateStudio('tips')} disabled={!hasSelectedSources} className={`flex items-center gap-3 p-4 rounded-xl border transition-all disabled:opacity-50 text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-gray-200 hover:border-emerald-400 hover:bg-slate-600' : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm'}`}>
                     <NotebookPen size={20} className="text-emerald-500" /> Tarjetas / Tips
                   </button>
                   <button onClick={() => handleGenerateStudio('analisis')} disabled={!hasSelectedSources} className={`flex items-center gap-3 p-4 rounded-xl border transition-all disabled:opacity-50 text-sm font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-gray-200 hover:border-orange-400 hover:bg-slate-600' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm'}`}>
                     <Sparkles size={20} className="text-orange-500" /> Análisis Profundo
                   </button>
                 </div>
                 <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                    <p className={`text-[11px] ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      <strong>Nota:</strong> Los resultados se generan leyendo exclusivamente el contexto disponible en la 
                      <button onClick={() => setShowMemoryModal(true)} disabled={!hasSelectedSources} className="underline ml-1 font-bold">Memoria Extraída</button>.
                    </p>
                 </div>
               </>
             )}

             {isGeneratingStudio && (
               <div className="flex flex-col items-center justify-center p-8 h-full text-center space-y-5">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin"></div>
                    <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500" size={20}/>
                  </div>
                  <p className={`text-sm font-bold animate-pulse ${themeClasses.textMain}`}>Fusionando la información...</p>
               </div>
             )}

             {studioResult && !isGeneratingStudio && (
               <div className="flex flex-col h-full fade-in">
                  <div className={`flex items-center justify-between mb-3 border-b pb-3 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                    <span className="text-xs font-black uppercase tracking-widest text-cyan-500">
                      RESULTADO: {studioResult.type}
                    </span>
                    <button onClick={() => setStudioResult(null)} className={`text-xs underline font-medium ${themeClasses.textMuted} hover:text-cyan-500`}>
                      Cerrar
                    </button>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto mb-3 pr-2 text-sm ${themeClasses.textMain}`}>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{studioResult.content}</pre>
                  </div>
                  
                  <button onClick={handleDownloadPDF} className="shrink-0 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all shadow-md">
                    <Printer size={18} /> Guardar (PDF/Word)
                  </button>
               </div>
             )}
          </div>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* MODAL DE MEMORIA */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
          <div className={`w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'} shrink-0`}>
               <div>
                  <h3 className={`font-bold ${themeClasses.textMain}`}>Memoria de Texto Extraído</h3>
                  <p className={`text-xs ${themeClasses.textMuted}`}>Revisa individualmente la transcripción que la IA está usando.</p>
               </div>
               <button onClick={() => setShowMemoryModal(false)} className={`px-4 py-2 text-sm font-medium rounded-lg ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                 Cerrar Visor
               </button>
            </div>
            
            {/* TABS DE FUENTES */}
            <div className={`flex overflow-x-auto hide-scrollbar border-b ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-gray-100/50'} shrink-0`}>
               {sources.filter(s => selectedIds.has(s.id)).map(source => {
                 const isActive = activeMemoryTab === source.id || (activeMemoryTab === null && Array.from(selectedIds)[0] === source.id);
                 return (
                   <button 
                     key={source.id} 
                     onClick={() => setActiveMemoryTab(source.id)}
                     className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${isActive ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                   >
                     {source.name}
                   </button>
                 );
               })}
            </div>

            <div className={`flex-1 overflow-y-auto p-6 text-sm font-mono ${isDark ? 'text-gray-300 bg-slate-900' : 'text-gray-800 bg-gray-50/50'}`}>
               <pre className="whitespace-pre-wrap">
                 {sources.filter(s => selectedIds.has(s.id)).length === 0 
                    ? "No hay fuentes seleccionadas."
                    : (sources.find(s => s.id === (activeMemoryTab || Array.from(selectedIds)[0]))?.extractedText || "[Texto pendiente o archivo no extraíble]")
                 }
               </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
