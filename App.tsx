import React, { useState, useCallback, useRef, useEffect } from 'react';

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
    
    // Tenta ler os dois nomes possíveis para não ter erro
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
    
    const [debugInfo, setDebugInfo] = useState<string>("Verificando...");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!apiKey) {
            setDebugInfo("❌ Chave não encontrada no .env");
        } else {
            setDebugInfo(`✅ Conexão Ativa`);
        }
    }, [apiKey]);

    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraActive) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) videoRef.current.srcObject = s;
                })
                .catch(() => {
                    setError("Câmera bloqueada.");
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
        if (!imageDataForApi) {
            setError("Capture ou selecione uma imagem primeiro.");
            return;
        }
        if (!apiKey) {
            setError("Chave API não configurada corretamente.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Traduza o texto desta imagem técnica para Português do Brasil." },
                            { inlineData: { mimeType: "image/jpeg", data: imageDataForApi } }
                        ]
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || "Erro na API do Google");
            }

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                setTranslatedText(data.candidates[0].content.parts[0].text);
            } else {
                throw new Error("Não foi possível ler o texto da imagem.");
            }

        } catch (err: any) {
            setError(`Falha: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center font-sans text-gray-900">
            <div className="w-full max-w-2xl bg-black text-green-400 p-2 rounded-t-xl font-mono text-[10px] flex justify-between px-4">
                <span>RD-ENGINE-PRO-V6</span>
                <span>{debugInfo}</span>
            </div>

            <header className="bg-orange-700 text-white p-6 rounded-b-3xl w-full max-w-2xl mb-8 flex items-center justify-center gap-4 shadow-2xl">
                <EngineeringIcon className="w-10 h-10"/>
                <h1 className="text-xl font-black uppercase tracking-tighter">TESTE CACHE 123</h1>
            </header>

            <main className="w-full max-w-2xl">
                {!imagePreview && !isCameraActive ? (
                    <div className="bg-white p-10 rounded-3xl shadow-lg flex flex-col gap-5">
                        <button onClick={() => setIsCameraActive(true)} className="bg-orange-600 text-white p-6 rounded-2xl font-bold text-lg hover:bg-orange-700">
                            📸 TIRAR FOTO DA PLACA
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 text-white p-6 rounded-2xl font-bold text-lg hover:bg-black">
                            📁 CARREGAR DA GALERIA
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                ) : isCameraActive ? (
                    <div className="flex flex-col gap-4 items-center bg-black p-4 rounded-3xl">
                        <video ref={videoRef} autoPlay playsInline className="rounded-2xl w-full max-w-sm border-2 border-orange-600" />
                        <div className="flex gap-4">
                            <button onClick={handleCapture} className="bg-orange-600 text-white px-10 py-4 rounded-full font-black">TIRAR FOTO</button>
                            <button onClick={() => setIsCameraActive(false)} className="bg-white text-black px-6 py-4 rounded-full font-bold">CANCELAR</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 w-full">
                        <div className="relative">
                            <img src={imagePreview!} className="rounded-3xl shadow-xl max-h-80 w-full object-contain bg-white" alt="Preview" />
                            <button onClick={() => {setImagePreview(null); setTranslatedText(null); setError(null);}} className="absolute -top-3 -right-3 bg-red-600 text-white w-10 h-10 rounded-full font-bold">✕</button>
                        </div>
                        
                        {!translatedText && (
                            <button 
                                onClick={handleTranslate} 
                                disabled={isLoading}
                                className={`${isLoading ? 'bg-gray-400' : 'bg-orange-700'} text-white p-6 rounded-3xl font-black text-xl shadow-2xl`}
                            >
                                {isLoading ? "TRADUZINDO..." : "TRADUZIR AGORA"}
                            </button>
                        )}

                        <div className="bg-white p-8 rounded-3xl shadow-xl border-l-8 border-orange-700">
                            <h3 className="text-orange-900 font-black text-xs uppercase mb-4">Resultado da Análise</h3>
                            {error && <div className="text-red-600 bg-red-50 p-4 rounded-xl font-bold text-sm mb-4 border border-red-200">{error}</div>}
                            <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                                {isLoading ? "Processando imagem..." : (translatedText || "Aguardando imagem...")}
                            </div>
                        </div>

                        <button onClick={() => {setImagePreview(null); setTranslatedText(null); setError(null);}} className="text-gray-500 font-bold py-4 uppercase text-[10px] tracking-widest">
                            Nova Tradução
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
