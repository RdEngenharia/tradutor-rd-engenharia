
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

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
// Em um projeto Vite real, use: const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_KEY = process.env.API_KEY;

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

    // --- Lógica de Upload e Processamento ---
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
            setError("Nenhuma imagem selecionada para traduzir.");
            return;
        }
        if (!API_KEY) {
            setError("Chave de API do Gemini não configurada. Verifique seu arquivo .env.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTranslatedText(null);

        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const model = 'gemini-flash-latest';

            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageDataForApi,
                },
            };

            const textPart = {
                text: 'Você é um tradutor técnico de engenharia. Identifique o texto nesta imagem e traduza-o para o Português do Brasil, mantendo os termos técnicos da área.',
            };

            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: [imagePart, textPart] },
            });

            if (response.text) {
                setTranslatedText(response.text.trim());
            } else {
                throw new Error("A resposta da API estava vazia.");
            }

        } catch (err) {
            console.error("Gemini API Error:", err);
            setError("Falha ao traduzir. A chave de API pode ser inválida ou o serviço está indisponível.");
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

    // --- Renderização ---
    return (
        <div className="min-h-screen bg-gray-200 flex flex-col font-sans">
            <header className="w-full bg-orange-800 text-white shadow-lg">
                <div className="max-w-4xl mx-auto p-4 flex items-center justify-center space-x-3">
                    <EngineeringIcon className="w-8 h-8"/>
                    <h1 className="text-2xl font-bold tracking-wider">Tradutor RD Engenharia</h1>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-4xl mx-auto">
                {!imagePreview && !isCameraActive && (
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Selecione uma imagem para traduzir</h2>
                        <div className="flex flex-col md:flex-row gap-4">
                            <button onClick={() => setIsCameraActive(true)} className="flex items-center justify-center gap-3 text-lg font-semibold bg-gray-700 text-white px-8 py-4 rounded-lg shadow-md hover:bg-gray-800 transition-transform transform hover:scale-105">
                               <CameraIcon className="w-6 h-6"/> Usar Câmera
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 text-lg font-semibold bg-gray-700 text-white px-8 py-4 rounded-lg shadow-md hover:bg-gray-800 transition-transform transform hover:scale-105">
                                <UploadIcon className="w-6 h-6"/> Enviar Arquivo
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                    </div>
                )}
                
                {isCameraActive && (
                    <div className="w-full flex flex-col items-center gap-4">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg shadow-xl border-4 border-gray-300"/>
                        <button onClick={handleCapture} className="bg-orange-800 text-white font-bold px-10 py-4 rounded-lg text-xl shadow-lg hover:bg-orange-900 transition-transform transform hover:scale-105">Capturar Foto</button>
                    </div>
                )}

                {imagePreview && (
                    <div className="w-full flex flex-col items-center gap-6">
                        <h2 className="text-2xl font-semibold text-gray-700">Imagem Selecionada</h2>
                        <img src={imagePreview} alt="Preview" className="max-w-full md:max-w-lg rounded-lg shadow-xl border-4 border-gray-300" />
                        
                        {!translatedText && !isLoading && (
                             <button onClick={handleTranslate} className="bg-orange-800 text-white font-bold px-10 py-4 rounded-lg text-xl shadow-lg hover:bg-orange-900 transition-transform transform hover:scale-105">
                                Traduzir Agora
                            </button>
                        )}

                        <div className="w-full bg-white rounded-lg shadow-lg p-6 mt-4">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Resultado da Tradução</h3>
                            {isLoading && <p className="text-gray-600 animate-pulse">Carregando... Por favor, aguarde.</p>}
                            {error && <p className="text-red-600 font-semibold">{error}</p>}
                            {translatedText && <p className="text-gray-800 text-lg whitespace-pre-wrap">{translatedText}</p>}
                        </div>

                        <button onClick={resetState} className="mt-4 bg-gray-600 text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:bg-gray-700 transition-transform transform hover:scale-105">
                            Traduzir Outra Imagem
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
