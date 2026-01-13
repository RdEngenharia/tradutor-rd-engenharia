import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Ícones ---
const EngineeringIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
    </svg>
);
const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
);
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const App: React.FC = () => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageDataForApi, setImageDataForApi] = useState<string | null>(null);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraActive) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) videoRef.current.srcObject = s;
                })
                .catch(() => {
                    setError("Permissão de câmera negada.");
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
            const dataUrl = canvas.toDataURL('image/jpeg');
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
        if (!imageDataForApi || !API_KEY) {
            setError("Selecione uma imagem ou configure a chave API.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setTranslatedText(null);

        try {
            // INICIALIZAÇÃO SEGURA: Forçamos a versão v1 da API
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel(
                { model: "gemini-1.5-flash" },
                { apiVersion: 'v1' } // Isso evita o 404 do v1beta
            );

            const prompt = "Traduza todo o texto técnico presente nesta imagem de engenharia para o Português do Brasil. Mantenha os termos técnicos originais quando necessário.";

            const result = await model.generateContent([
                prompt,
                { inlineData: { mimeType: "image/jpeg", data: imageDataForApi } }
            ]);
            
            const response = await result.response;
            setTranslatedText(response.text());
        } catch (err: any) {
            console.error("API Error:", err);
            setError(`Falha na IA: ${err.message.includes("404") ? "Modelo não encontrado. Verifique se sua chave API é válida para o Gemini 1.5." : err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-orange-700 text-white p-5 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
                    <EngineeringIcon className="w-8 h-8"/>
                    <h1 className="text-xl font-bold uppercase tracking-widest">RD Engenharia | Tradutor IA</h1>
                </div>
            </header>

            <main className="flex-grow p-4 max-w-4xl mx-auto w-full flex flex-col items-center justify-center">
                {!imagePreview && !isCameraActive ? (
                    <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col gap-6 w-full max-w-md text-center">
                        <h2 className="text-gray-600 font-medium">Selecione o documento técnico</h2>
                        <button onClick={() => setIsCameraActive(true)} className="bg-orange-600 text-white p-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors">
                            <CameraIcon className="w-6 h-6"/> Usar Câmera
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 text-white p-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-black transition-colors">
                            <UploadIcon className="w-6 h-6"/> Carregar Arquivo
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                ) : isCameraActive ? (
                    <div className="flex flex-col gap-4 items-center w-full">
                        <video ref={videoRef} autoPlay playsInline className="rounded-2xl border-4 border-orange-700 w-full max-w-sm bg-black shadow-2xl" />
                        <div className="flex gap-3">
                            <button onClick={handleCapture} className="bg-orange-700 text-white px-8 py-4 rounded-full font-bold shadow-lg">Capturar Foto</button>
                            <button onClick={() => setIsCameraActive(false)} className="bg-gray-500 text-white px-8 py-4 rounded-full font-bold">Voltar</button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex flex-col gap-6 items-center">
                        <img src={imagePreview!} className="max-w-sm rounded-2xl shadow-2xl border-2 border-gray-200" alt="Preview" />
                        
                        {!translatedText && !isLoading && (
                            <button onClick={handleTranslate} className="bg-orange-700 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-orange-800 transition-all active:scale-95">
                                TRADUZIR DOCUMENTO
                            </button>
                        )}

                        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full border-t-8 border-orange-700 min-h-[200px] relative">
                            <h3 className="font-bold text-orange-900 border-b pb-2 mb-4">TRADUÇÃO TÉCNICA:</h3>
                            {isLoading && (
                                <div className="flex items-center gap-3 text-orange-700 animate-pulse font-bold justify-center py-10">
                                    <div className="w-3 h-3 bg-orange-700 rounded-full animate-bounce"></div>
                                    Processando Engenharia...
                                </div>
                            )}
                            {error && <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-100 font-medium">{error}</div>}
                            {translatedText && (
                                <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap animate-in fade-in duration-500">
                                    {translatedText}
                                </div>
                            )}
                        </div>
                        <button onClick={() => {setImagePreview(null); setTranslatedText(null); setError(null);}} className="text-gray-500 underline font-medium py-4">Nova Digitalização</button>
                    </div>
                )}
            </main>
            
            <footer className="p-4 text-center text-gray-400 text-xs uppercase tracking-widest">
                RD Engenharia &copy; 2026 | Tecnologia de Visão Computacional
            </footer>
        </div>
    );
};

export default App;