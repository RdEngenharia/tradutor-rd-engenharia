import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Ícones ---
const EngineeringIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
    </svg>
);

const App: React.FC = () => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageDataForApi, setImageDataForApi] = useState<string | null>(null);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    
    // Pegando a chave do ambiente (Vite)
    const apiKeyFromEnv = import.meta.env.VITE_GEMINI_API_KEY;
    const [debugInfo, setDebugInfo] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Diagnóstico de inicialização
    useEffect(() => {
        if (!apiKeyFromEnv) {
            setDebugInfo("❌ Chave VITE_GEMINI_API_KEY não detectada.");
        } else {
            setDebugInfo(`✅ Sistema Pronto (Chave ativa)`);
        }
    }, [apiKeyFromEnv]);

    // Gerenciamento da Câmera
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraActive) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) videoRef.current.srcObject = s;
                })
                .catch(() => {
                    setError("Câmera não disponível ou permissão negada.");
                    setIsCameraActive(false);
                });
        }
        return () => stream?.getTracks().forEach(t => t.stop());
    }, [isCameraActive]);

    const handleCapture = useCallback(() => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setImagePreview(dataUrl);
            setImageDataForApi(dataUrl.split(',')[1]);
            setIsCameraActive(false);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setImagePreview(base64);
                setImageDataForApi(base64.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTranslate = async () => {
        // Trava de segurança: impede envio sem imagem
        if (!imageDataForApi) {
            setError("Por favor, capture ou carregue uma imagem primeiro.");
            return;
        }

        if (!apiKeyFromEnv) {
            setError("Chave API não configurada no servidor.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTranslatedText(null);

        try {
            const genAI = new GoogleGenerativeAI(apiKeyFromEnv);
            
            // Configuração estável da API v1 para evitar erro 404
            const model = genAI.getGenerativeModel(
                { model: "gemini-1.5-flash" },
                { apiVersion: 'v1' } 
            );

            const prompt = "Aja como um engenheiro tradutor. Traduza com precisão técnica todo o texto desta imagem para Português do Brasil.";

            const result = await model.generateContent([
                prompt,
                { inlineData: { mimeType: "image/jpeg", data: imageDataForApi } }
            ]);
            
            const response = await result.response;
            const text = response.text();
            
            if (!text) throw new Error("A IA não conseguiu identificar texto na imagem.");
            
            setTranslatedText(text);
        } catch (err: any) {
            console.error("Erro na API Gemini:", err);
            // Mensagem amigável para erros comuns
            const msg = err.message.includes("404") 
                ? "Modelo não encontrado. Verifique a versão da API." 
                : err.message;
            setError(`Falha técnica: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center font-sans">
            {/* Barra de Status */}
            <div className="w-full max-w-2xl bg-gray-900 text-green-400 p-2 rounded-t-xl font-mono text-[10px] flex justify-between px-4">
                <span>RD ENGENHARIA v2.0</span>
                <span>{debugInfo}</span>
            </div>

            <header className="bg-orange-700 text-white p-6 rounded-b-3xl w-full max-w-2xl mb-8 flex items-center justify-center gap-4 shadow-xl border-b-4 border-orange-900">
                <EngineeringIcon className="w-10 h-10"/>
                <h1 className="text-xl font-black uppercase tracking-tighter">Tradutor Técnico</h1>
            </header>

            <main className="w-full max-w-2xl">
                {!imagePreview && !isCameraActive ? (
                    <div className="bg-white p-10 rounded-3xl shadow-lg flex flex-col gap-5 border border-gray-200">
                        <button onClick={() => setIsCameraActive(true)} className="bg-orange-600 text-white p-6 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-md active:scale-95">
                            📸 TIRAR FOTO DA PLACA
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 text-white p-6 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-md active:scale-95">
                            📁 CARREGAR ARQUIVO
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                ) : isCameraActive ? (
                    <div className="flex flex-col gap-4 items-center bg-black p-4 rounded-3xl shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline className="rounded-2xl w-full max-w-sm border-2 border-orange-700" />
                        <div className="flex gap-4">
                            <button onClick={handleCapture} className="bg-orange-600 text-white px-10 py-4 rounded-full font-black text-lg shadow-lg active:scale-90">
                                CAPTURAR
                            </button>
                            <button onClick={() => setIsCameraActive(false)} className="bg-white text-black px-6 py-4 rounded-full font-bold">
                                VOLTAR
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 w-full">
                        <div className="relative group">
                            <img src={imagePreview!} className="rounded-3xl shadow-xl max-h-80 w-full object-contain bg-white border-4 border-white" alt="Preview" />
                            <button onClick={() => {setImagePreview(null); setTranslatedText(null);}} className="absolute -top-2 -right-2 bg-red-600 text-white w-8 h-8 rounded-full shadow-lg font-bold">✕</button>
                        </div>
                        
                        {!translatedText && (
                            <button 
                                onClick={handleTranslate} 
                                disabled={isLoading}
                                className={`${isLoading ? 'bg-gray-400' : 'bg-orange-700'} text-white p-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95`}
                            >
                                {isLoading ? "PROCESSANDO..." : "EXECUTAR TRADUÇÃO"}
                            </button>
                        )}

                        <div className="bg-white p-8 rounded-3xl shadow-xl border-l-8 border-orange-700 min-h-[150px]">
                            <h3 className="text-orange-900 font-black text-xs uppercase mb-4 tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-700 rounded-full animate-pulse"></span>
                                Resultado da Tradução
                            </h3>
                            
                            {error && (
                                <div className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 font-bold text-sm mb-4 animate-bounce">
                                    {error}
                                </div>
                            )}

                            <div className="text-gray-800 text-lg whitespace-pre-wrap leading-relaxed font-medium italic">
                                {isLoading ? (
                                    <div className="flex flex-col items-center py-6 gap-2">
                                        <div className="w-6 h-6 border-4 border-orange-700 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-gray-500 font-bold">A IA está lendo a imagem...</span>
                                    </div>
                                ) : (
                                    translatedText || "O resultado aparecerá aqui."
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={() => {setImagePreview(null); setTranslatedText(null); setError(null);}} 
                            className="text-gray-400 font-bold py-4 hover:text-orange-700 transition-colors uppercase text-xs tracking-widest"
                        >
                            Nova Tradução
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;