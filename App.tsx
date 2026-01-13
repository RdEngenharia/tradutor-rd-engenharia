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

// --- Configuração da API ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');

const App: React.FC = () => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageDataForApi, setImageDataForApi] = useState<string | null>(null);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // --- Lógica da Câmera ---
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraActive) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(streamObj => {
                    stream = streamObj;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Camera Error:", err);
                    setError("Não foi possível acessar a câmera. Verifique as permissões.");
                    setIsCameraActive(false);
                });
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraActive]);

    const handleCapture = useCallback(() => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setImagePreview(dataUrl);
            setImageDataForApi(dataUrl.split(',')[1]);
            setIsCameraActive(false);
        }
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                setImageDataForApi(base64String.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleTranslate = async () => {
        if (!imageDataForApi) {
            setError("Nenhuma imagem selecionada.");
            return;
        }
        if (!API_KEY) {
            setError("Chave de API ausente. Verifique as variáveis de ambiente.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTranslatedText(null);

        try {
            // INICIALIZAÇÃO DEFINITIVA: Forçando apiVersion 'v1' para evitar o erro 404
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel(
                { model: "gemini-1.5-flash" },
                { apiVersion: 'v1' }
            );

            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageDataForApi,
                },
            };

            const prompt = "Você é um especialista em engenharia. Traduza o texto técnico desta imagem para o Português do Brasil de forma clara e profissional.";

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            if (text) {
                setTranslatedText(text.trim());
            } else {
                throw new Error("A IA não retornou resultados.");
            }

        } catch (err: any) {
            console.error("Erro na Chamada API:", err);
            setError(`Erro na tradução: ${err.message || "Falha na comunicação com o Google Gemini."}`);
        } finally {
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setImagePreview(null);
        setImageDataForApi(null);
        setTranslatedText(null);
        setError(null);
        setIsLoading(false);
        setIsCameraActive(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
            <header className="w-full bg-orange-700 text-white shadow-md">
                <div className="max-w-4xl mx-auto p-4 flex items-center justify-center space-x-3">
                    <EngineeringIcon className="w-8 h-8"/>
                    <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-center">RD Engenharia | Tradutor Técnico</h1>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-4 w-full max-w-4xl mx-auto">
                {!imagePreview && !isCameraActive && (
                    <div className="bg-white p-8 rounded-2xl shadow-xl text-center w-full">
                        <h2 className="text-xl font-medium text-gray-600 mb-8">Captura de Documentos e Projetos</h2>
                        <div className="flex flex-col md:flex-row justify-center gap-6">
                            <button onClick={() => setIsCameraActive(true)} className="flex items-center justify-center gap-3 bg-orange-600 text-white px-10 py-5 rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all active:scale-95">
                               <CameraIcon className="w-6 h-6"/> Abrir Câmera
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 bg-gray-800 text-white px-10 py-5 rounded-xl font-bold shadow-lg hover:bg-black transition-all active:scale-95">
                                <UploadIcon className="w-6 h-6"/> Galeria de Fotos
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                    </div>
                )}
                
                {isCameraActive && (
                    <div className="w-full flex flex-col items-center gap-4">
                        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-xl shadow-2xl border-4 border-orange-700 bg-black"/>
                        <div className="flex gap-4">
                            <button onClick={handleCapture} className="bg-orange-700 text-white font-bold px-8 py-4 rounded-full shadow-lg active:scale-95">Tirar Foto</button>
                            <button onClick={() => setIsCameraActive(false)} className="bg-gray-500 text-white font-bold px-8 py-4 rounded-full active:scale-95">Cancelar</button>
                        </div>
                    </div>
                )}

                {imagePreview && (
                    <div className="w-full flex flex-col items-center gap-6">
                        <img src={imagePreview} alt="Preview" className="w-full max-w-md rounded-lg shadow-lg border-2 border-gray-300" />
                        
                        {!translatedText && !isLoading && (
                             <button onClick={handleTranslate} className="bg-orange-700 text-white font-black px-12 py-5 rounded-xl text-xl shadow-2xl hover:bg-orange-800 animate-pulse active:scale-95">
                                EXECUTAR TRADUÇÃO
                            </button>
                        )}

                        <div className="w-full bg-white rounded-xl shadow-2xl p-6 border-t-8 border-orange-700 min-h-[150px]">
                            <h3 className="text-lg font-bold text-orange-900 mb-4 border-b pb-2">LAUDO DE TRADUÇÃO TÉCNICA:</h3>
                            {isLoading && (
                                <div className="flex items-center gap-3 text-orange-700 font-bold justify-center py-4">
                                    <div className="w-4 h-4 bg-orange-700 rounded-full animate-ping"></div>
                                    Processando Inteligência Artificial...
                                </div>
                            )}
                            {error && (
                                <div className="text-red-600 p-4 bg-red-50 rounded border border-red-200">
                                    <strong>Erro:</strong> {error}
                                </div>
                            )}
                            {translatedText && (
                                <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                                    {translatedText}
                                </div>
                            )}
                        </div>

                        <button onClick={resetState} className="text-gray-500 underline font-medium hover:text-orange-700 transition-colors">
                            Limpar e Iniciar Nova Captura
                        </button>
                    </div>
                )}
            </main>
            
            <footer className="p-4 text-center text-gray-400 text-xs uppercase tracking-widest">
                Desenvolvido para RD Engenharia &copy; 2026 | Powered by Gemini AI
            </footer>
        </div>
    );
};

export default App;