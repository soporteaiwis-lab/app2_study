import React, { useState, useRef } from "react";
import { generateHtmlInfographic, generateAudioSummary } from "../services/geminiService";
import { Sparkles, Image as ImageIcon, Headphones, Loader2, Play, Square, Download, FileText } from "lucide-react";

type CanvasMode = 'infografia' | 'audio';

export default function GeneradorCanvas() {
  const [mode, setMode] = useState<CanvasMode>('infografia');
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Results
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [audioScript, setAudioScript] = useState<string | null>(null);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Use a ref for the synthesizer so we can stop it if the component unmounts
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setHtmlContent(null);
    setAudioScript(null);
    stopAudio();

    try {
      if (mode === 'infografia') {
        const html = await generateHtmlInfographic(topic);
        setHtmlContent(html);
      } else {
        const script = await generateAudioSummary(topic);
        setAudioScript(script);
      }
    } catch (error) {
      alert("Hubo un error en la generación.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = () => {
    if (!audioScript || !synthRef.current) return;
    
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(audioScript);
    utterance.lang = 'es-ES'; // Spanish voice
    utterance.rate = 1.05; // Slightly faster for podcast feel
    
    utterance.onend = () => {
      setIsPlaying(false);
    };

    synthRef.current.speak(utterance);
  };

  const stopAudio = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infografia-\${topic.replace(/\\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Generador Canvas RAG</h1>
          <p className="text-sm text-gray-500 mt-1">Crea infografías interactivas y resúmenes de audio usando IA.</p>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2 shrink-0 max-w-md">
        <button
          onClick={() => { setMode('infografia'); stopAudio(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all \${
            mode === 'infografia' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ImageIcon size={18} />
          Infografía HTML
        </button>
        <button
          onClick={() => setMode('audio')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all \${
            mode === 'audio' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Headphones size={18} />
          Resumen Audio
        </button>
      </div>

      <form onSubmit={handleGenerate} className="flex gap-3 shrink-0">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={mode === 'infografia' ? "¿Sobre qué tema quieres la infografía?" : "¿Qué tema quieres resumir en audio?"}
          className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-colors text-gray-900"
          disabled={isGenerating}
        />
        <button
          type="submit"
          disabled={!topic.trim() || isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          Generar
        </button>
      </form>

      {/* Canvas Area */}
      <div className="flex-1 bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden relative min-h-0 container-bg">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 backdrop-blur-sm z-10 space-y-4">
            <Loader2 size={40} className="animate-spin text-indigo-500" />
            <p className="font-medium text-gray-600 text-lg">
              {mode === 'infografia' ? 'Diseñando infografía interactiva...' : 'Escribiendo el guion del podcast...'}
            </p>
          </div>
        ) : null}

        {/* Default Empty State */}
        {!htmlContent && !audioScript && !isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Sparkles size={64} className="text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">El lienzo está vacío.</p>
            <p className="text-sm">Escribe un tema arriba y presiona Generar.</p>
          </div>
        )}

        {/* Infographic Result */}
        {mode === 'infografia' && htmlContent && !isGenerating && (
          <div className="absolute inset-0 flex flex-col">
            <div className="bg-gray-800 text-gray-200 p-2 flex justify-end shrink-0">
              <button 
                onClick={handleDownloadHtml}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium text-white transition-colors"
              >
                <Download size={14} /> Descargar HTML
              </button>
            </div>
            <iframe 
              srcDoc={htmlContent} 
              className="w-full flex-1 bg-white border-none"
              title="Generated Infographic"
            />
          </div>
        )}

        {/* Audio Result */}
        {mode === 'audio' && audioScript && !isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100">
              
              {/* Player Header */}
              <div className="bg-purple-600 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 text-purple-500 opacity-20">
                  <Headphones size={200} />
                </div>
                <h3 className="text-2xl font-bold text-white relative z-10">Cápsula de Estudio</h3>
                <p className="text-purple-200 mt-2 relative z-10">Tema: {topic}</p>
                
                <div className="mt-8 flex justify-center gap-4 relative z-10">
                  {!isPlaying ? (
                    <button 
                      onClick={playAudio}
                      className="bg-white text-purple-600 rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
                    >
                      <Play size={32} className="ml-1" />
                    </button>
                  ) : (
                    <button 
                      onClick={stopAudio}
                      className="bg-red-500 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform animate-pulse"
                    >
                      <Square size={32} />
                    </button>
                  )}
                </div>
              </div>

              {/* Script Text */}
              <div className="p-8 prose prose-purple mx-auto">
                <h4 className="text-gray-400 uppercase tracking-wider text-xs font-bold mb-4 flex items-center gap-2">
                  <FileText size={14} /> Guion Generado
                </h4>
                <div className="text-gray-700 leading-relaxed font-medium">
                  {audioScript.split('\\n').map((para, i) => para ? <p key={i}>{para}</p> : null)}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .container-bg {
          background-image: radial-gradient(circle at center, #f3f4f6 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
}
