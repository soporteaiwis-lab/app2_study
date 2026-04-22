import React, { useState, useEffect, useRef } from "react";
import { DriveFile, getStudyFiles, getFileDownloadUrl } from "../services/driveService";
import { extractTextFromPdfUrl } from "../services/pdfService";
import { askGeminiAboutPdf, ChatMessage } from "../services/geminiService";
import { FileText, Loader2, AlertCircle, Library, Send, Bot, User as UserIcon } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

export default function BaseDeConocimiento() {
  const { user } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extracting, setExtracting] = useState(false);

  // Chat/RAG State
  const [activeTab, setActiveTab] = useState<'texto' | 'chat'>('texto');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isThinking]);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudyFiles();
      setFiles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async (file: DriveFile) => {
    setSelectedFile(file);
    setExtracting(true);
    setExtractedText("");
    setMessages([]); // Reset chat when changing files
    setActiveTab('texto'); // Default to text view

    try {
      const url = await getFileDownloadUrl(file.id);
      const text = await extractTextFromPdfUrl(url);
      setExtractedText(text);
      
      // Añadir mensaje inicial de Gilda
      setMessages([{
        role: 'model',
        text: `¡Hola ${user?.displayName?.split(' ')[0] || 'estudiante'}! He leído "${file.name}". ¿Qué dudas tienes sobre este tema?`
      }]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !extractedText || isThinking) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsThinking(true);

    try {
      const responseText = await askGeminiAboutPdf(userMessage, extractedText, messages);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `❌ Oh no, ocurrió un error: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Base de Conocimiento IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tus apuntes de Drive potenciados por Gemini. Selecciona un archivo y pregúntale a Gilda.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 shrink-0">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Lista de archivos */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0">
          <h2 className="font-semibold text-gray-800 mb-4 px-2 shrink-0">Tus PDFs</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-blue-500" />
              </div>
            ) : files.length === 0 && !error ? (
              <p className="text-sm text-gray-500 text-center p-4">No se encontraron PDFs.</p>
            ) : (
              files.map(file => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors \${
                    selectedFile?.id === file.id ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50 border-transparent"
                  } border`}
                >
                  <FileText className={`shrink-0 mt-0.5 \${selectedFile?.id === file.id ? "text-blue-600" : "text-red-500"}`} size={20} />
                  <span className={`text-sm font-medium line-clamp-2 \${selectedFile?.id === file.id ? "text-blue-900" : "text-gray-700"}`}>
                    {file.name}
                  </span>
                </button>
              ))
            )}
          </div>
          <button 
            onClick={fetchFiles}
            className="mt-4 shrink-0 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Refrescar Carpeta
          </button>
        </div>

        {/* Vista previa y Chat RAG */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0">
          {selectedFile ? (
            <>
              {/* Header con Tabs */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0 rounded-t-xl">
                <div className="flex items-center gap-2 max-w-full overflow-hidden">
                  <FileText size={20} className="text-blue-600 shrink-0" />
                  <h3 className="font-medium text-gray-800 truncate" title={selectedFile.name}>{selectedFile.name}</h3>
                </div>
                
                <div className="flex gap-1 bg-gray-200/60 p-1 rounded-lg shrink-0">
                  <button 
                    onClick={() => setActiveTab('texto')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all \${activeTab === 'texto' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Texto Extraído
                  </button>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    disabled={extracting || !extractedText}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 \${activeTab === 'chat' ? 'bg-blue-600 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Bot size={16} />
                    Chat IA
                  </button>
                </div>
              </div>

              {/* Contenido Dinámico */}
              <div className="flex-1 overflow-hidden relative">
                
                {/* Tab: Texto */}
                {activeTab === 'texto' && (
                  <div className="absolute inset-0 overflow-y-auto p-6 bg-gray-50/30">
                    {extracting ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                        <p className="text-sm">Leyendo y procesando el documento...</p>
                      </div>
                    ) : extractedText ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">{extractedText}</pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <p>No se pudo procesar el texto.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Chat */}
                {activeTab === 'chat' && (
                  <div className="absolute inset-0 flex flex-col bg-white">
                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 \${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center \${msg.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm'}`}>
                            {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                          </div>
                          <div className={`max-w-[80%] rounded-2xl px-5 py-3 \${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none prose prose-sm'}`}>
                            <p className="whitespace-pre-wrap m-0 leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      
                      {isThinking && (
                        <div className="flex gap-4">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                            <Bot size={16} />
                          </div>
                          <div className="bg-gray-100 rounded-2xl rounded-tl-none px-5 py-4 flex flex-col justify-center gap-1.5 min-w-[80px]">
                            <div className="flex gap-1.5">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Pensando</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                      <form onSubmit={handleSendMessage} className="relative flex items-center">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Pregúntale a Gilda sobre este documento..."
                          disabled={isThinking}
                          className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isThinking}
                          className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send size={18} />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 p-8 text-center">
              <Library size={64} className="text-gray-200" />
              <h3 className="text-xl font-medium text-gray-700">Selecciona un documento</h3>
              <p className="max-w-xs">Toca uno de tus recursos a la izquierda para analizar su contenido y comenzar a chatear.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
