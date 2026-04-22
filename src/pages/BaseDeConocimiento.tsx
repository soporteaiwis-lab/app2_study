import React, { useState, useEffect, useRef } from "react";
import { DriveFile, getStudyFiles, getFileDownloadUrl } from "../services/driveService";
import { extractTextFromPdfUrl } from "../services/pdfService";
import { askGeminiAboutSources, generateStudioContent, ChatMessage } from "../services/geminiService";
import { 
  FileText, Loader2, AlertCircle, Send, Bot, User as UserIcon, 
  Upload, Cloud, MonitorUp, CheckSquare, Square, Download, 
  FileCheck, NotebookPen, FileQuestion, Sparkles, BrainCircuit 
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

export default function BaseDeConocimiento() {
  const { user } = useAuth();
  
  // Archivos y Selección
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingDrive, setLoadingDrive] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Studio (Generador)
  const [studioResult, setStudioResult] = useState<{type: string, content: string} | null>(null);
  const [isGeneratingStudio, setIsGeneratingStudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDriveFiles();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

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
      // Merge with existing locals
      setSources(prev => [...prev.filter(s => s.type === 'local'), ...mapped]);
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        type: 'local' as const,
        id: `local-\${Date.now()}-\${file.name}`,
        name: file.name,
        mimeType: file.type,
        data: file
      }));
      setSources(prev => [...prev, ...newFiles]);
    }
  };

  const toggleSourceSelection = async (sourceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId);
      setSelectedIds(newSelected);
      return;
    }

    newSelected.add(sourceId);
    setSelectedIds(newSelected);

    // Extract text automatically if not already extracted
    const sourceIndex = sources.findIndex(s => s.id === sourceId);
    const source = sources[sourceIndex];
    
    if (source && !source.extractedText && !source.isExtracting) {
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isExtracting: true } : s));
      try {
        let text = "";
        if (source.type === 'drive') {
          if (source.mimeType === 'application/pdf') {
            const url = await getFileDownloadUrl(source.data.id);
            text = await extractTextFromPdfUrl(url);
          } else {
             text = `[Archivo de Drive: \${source.name}]\\nFormato no extraíble automáticamente en esta versión. Se detecta el archivo en la carpeta.`;
          }
        } else {
          const file = source.data;
          if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            text = await extractTextFromPdfUrl(url);
          } else if (file.type === 'text/plain') {
            text = await file.text();
          } else {
            text = `[Archivo Local: \${source.name}]\\nContenido multimedia o no compatible con la lectura de texto directo actual.`;
          }
        }
        setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isExtracting: false, extractedText: text } : s));
      } catch (err: any) {
         setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isExtracting: false, error: err.message } : s));
      }
    }
  };

  const getCombinedContextText = () => {
    const selectedSourcesData = sources.filter(s => selectedIds.has(s.id));
    if (selectedSourcesData.length === 0) return "";
    return selectedSourcesData
      .map(s => `=== FUENTE: \${s.name} ===\\n\${s.extractedText || '[Pendiente o sin texto]'}`)
      .join('\\n\\n');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isThinking || selectedIds.size === 0) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsThinking(true);

    try {
      const combinedContext = getCombinedContextText();
      const responseText = await askGeminiAboutSources(userMessage, combinedContext, messages);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `❌ Hubo un error de conexión con la IA: \${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
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

  const handleDownloadStudio = () => {
    if (!studioResult) return;
    const blob = new Blob([studioResult.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gilda_\${studioResult.type}_\${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasSelectedSources = selectedIds.size > 0;
  // Comprobar si todas las fuentes seleccionadas ya terminaron de ser extraídas
  const isAnySelectedExtracting = sources.filter(s => selectedIds.has(s.id)).some(s => s.isExtracting);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      {/* Header Título Minimalista */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Estudio RAG Multifuente</h1>
          <p className="text-sm text-gray-500">Selecciona fuentes y diles a Gilda qué hacer con ellas.</p>
        </div>
      </div>

      {globalError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 shrink-0 text-sm">
          <AlertCircle size={18} />
          <p>{globalError}</p>
        </div>
      )}

      {/* Grid estilo NotebookLM (3 columnas) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* PANEL IZQUIERDO: FUENTES */}
        <div className="w-full lg:w-1/4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[250px]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl shrink-0">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileCheck size={18} className="text-blue-600" />
              Tus Fuentes
            </h2>
            <div className="flex gap-1">
              <button onClick={fetchDriveFiles} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Sincronizar Google Drive">
                 <Cloud size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingDrive && sources.length === 0 ? (
              <div className="flex justify-center p-8 text-blue-500"><Loader2 className="animate-spin" size={24} /></div>
            ) : sources.length === 0 ? (
              <p className="text-xs text-gray-400 text-center p-4">No hay fuentes disponibles.</p>
            ) : (
              sources.map(source => {
                const isSelected = selectedIds.has(source.id);
                return (
                  <div key={source.id} 
                    className={`group relative flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm \${
                      isSelected ? "border-blue-400 bg-blue-50/30" : "border-gray-100 hover:border-gray-200"
                    }`}
                    onClick={() => toggleSourceSelection(source.id)}
                  >
                    <div className="mt-0.5 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                       {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm font-medium line-clamp-2 \${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                        {source.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {source.type === 'drive' ? <Cloud size={12} className="text-blue-400"/> : <MonitorUp size={12} className="text-green-500"/>}
                        {source.isExtracting ? (
                          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Leyendo...</span>
                        ) : source.extractedText ? (
                          <span className="text-[10px] text-green-600 font-medium">Lista</span>
                        ) : source.error ? (
                          <span className="text-[10px] text-red-500 truncate" title={source.error}>Error</span>
                        ) : (
                           <span className="text-[10px] text-gray-400">Sin analizar</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-3 border-t border-gray-100 shrink-0">
             <input type="file" multiple ref={fileInputRef} onChange={handleLocalUpload} className="hidden" accept=".pdf,.txt" />
             <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
               <Upload size={16} /> Subir Archivos Local
             </button>
          </div>
        </div>

        {/* PANEL CENTRAL: CHAT CONSTANTE */}
        <div className="w-full lg:w-2/4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl shrink-0 flex items-center gap-2">
             <Bot size={18} className="text-indigo-600" />
             <h2 className="font-semibold text-gray-800">Chat de Gilda</h2>
             <span className="ml-auto text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
               {selectedIds.size} fuentes conectadas
             </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white shrink">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center px-6">
                 <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                   <Sparkles size={32} />
                 </div>
                 <h3 className="text-gray-900 font-medium mb-2">¡Hola! Soy tu asistente de estudio.</h3>
                 <p className="text-sm text-gray-500 max-w-sm">Selecciona las fuentes en el panel izquierdo que deseas que lea. Luego, hazme preguntas aquí abajo sobre cualquier detalle de esos documentos.</p>
               </div>
            ) : (
               messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 \${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm \${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                    {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 \${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-none prose prose-sm'}`}>
                    <p className="whitespace-pre-wrap m-0 leading-relaxed font-sans">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            
            {isThinking && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Bot size={14} />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none px-5 py-4 flex flex-col justify-center gap-1.5 min-w-[80px]">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-white shrink-0 rounded-b-xl">
             <form onSubmit={handleSendMessage} className="relative flex items-center">
               <input
                 type="text"
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 placeholder={hasSelectedSources ? (isAnySelectedExtracting ? "Gilda está leyendo los pdfs..." : "Hazme una pregunta sobre tus fuentes...") : "Selecciona una fuente a la izquierda primero..."}
                 disabled={isThinking || !hasSelectedSources || isAnySelectedExtracting}
                 className="w-full pl-5 pr-14 py-4 bg-gray-100 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-60 text-sm"
               />
               <button
                 type="submit"
                 disabled={!chatInput.trim() || isThinking || !hasSelectedSources || isAnySelectedExtracting}
                 className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
               >
                 <Send size={18} className="translate-x-0.5" />
               </button>
             </form>
          </div>
        </div>

        {/* PANEL DERECHO: ESTUDIO (STUDIO) */}
        <div className="w-full lg:w-1/4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[250px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl shrink-0">
             <h2 className="font-semibold text-gray-800 flex items-center gap-2">
               <BrainCircuit size={18} className="text-purple-600" />
               Generar Recursos
             </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
             {!studioResult && !isGeneratingStudio && (
               <>
                 <p className="text-xs text-center text-gray-500 px-2 mb-2">Selecciona fuentes y presiona una acción para generar contenido automático completo.</p>
                 <div className="grid grid-cols-1 gap-2.5">
                   <button onClick={() => handleGenerateStudio('resumen')} disabled={!hasSelectedSources} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left disabled:opacity-50 text-sm font-medium text-gray-700">
                     <FileText size={18} className="text-purple-500" /> Resumen Ejecutivo
                   </button>
                   <button onClick={() => handleGenerateStudio('cuestionario')} disabled={!hasSelectedSources} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 text-sm font-medium text-gray-700">
                     <FileQuestion size={18} className="text-blue-500" /> Cuestionario FAQ
                   </button>
                   <button onClick={() => handleGenerateStudio('tips')} disabled={!hasSelectedSources} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left disabled:opacity-50 text-sm font-medium text-gray-700">
                     <NotebookPen size={18} className="text-green-500" /> Tips de Estudio
                   </button>
                   <button onClick={() => handleGenerateStudio('analisis')} disabled={!hasSelectedSources} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left disabled:opacity-50 text-sm font-medium text-gray-700">
                     <Sparkles size={18} className="text-orange-500" /> Análisis Profundo
                   </button>
                 </div>
               </>
             )}

             {isGeneratingStudio && (
               <div className="flex flex-col items-center justify-center p-8 h-full text-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                    <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600" size={16}/>
                  </div>
                  <p className="text-sm font-medium text-gray-600 animate-pulse">Cruzando información de las fuentes...</p>
               </div>
             )}

             {studioResult && !isGeneratingStudio && (
               <div className="flex flex-col h-full fade-in">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                      RESULTADO: {studioResult.type}
                    </span>
                    <button onClick={() => setStudioResult(null)} className="text-xs text-gray-400 hover:text-gray-700 underline">
                      Volver
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto mb-3 pr-1 text-sm text-gray-700">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{studioResult.content}</pre>
                  </div>
                  
                  <button onClick={handleDownloadStudio} className="shrink-0 w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                    <Download size={16} /> Descargar .md
                  </button>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
