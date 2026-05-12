import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../src/components/ui/MCAKingLoader';

interface ChatbotProps {
    context: string;
}

interface Message {
    sender: 'user' | 'bot' | 'error';
    text: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ context }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const
            prompt = `
                You are an expert AI assistant for "MCA King", a Merchant Cash Advance application platform.
                Your role is to help users (merchants, lenders, sales reps, admins) by answering their questions about the application process, terminology, or how to use the platform.
                Keep your answers concise, friendly, and helpful. Do not make up information you don't know.

                Current User Context: ${context}

                User's Question: "${userMessage.text}"
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const botMessage: Message = { sender: 'bot', text: response.text };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage: Message = { sender: 'error', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chat Window */}
            <div className={`fixed bottom-24 right-4 sm:right-8 w-80 sm:w-96 h-[500px] bg-white dark:bg-dark-card shadow-2xl rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'transform translate-y-0 opacity-100' : 'transform translate-y-10 opacity-0 pointer-events-none'}`}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">AI Assistant</h3>
                    <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <div className="p-3 rounded-lg bg-theme-teal/10 text-sm text-slate-700 dark:text-slate-300">
                        <p className="font-semibold">Hello!</p>
                        <p>How can I help you with your application today?</p>
                    </div>
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                msg.sender === 'user' ? 'bg-theme-yellow text-theme-black' : 
                                msg.sender === 'bot' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' :
                                'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                             <div className="max-w-[90%] rounded-lg bg-slate-100 p-3 dark:bg-slate-700">
                                <MCAKingLoader label="Thinking..." size="small" />
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            disabled={isLoading}
                            className="flex-1 block w-full rounded-md border-0 py-2.5 px-4 text-slate-800 bg-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-theme-yellow dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-theme-yellow"
                            aria-label="Chat message"
                        />
                        <PrimaryButton type="submit" label="Send" size="small" disabled={isLoading} />
                    </form>
                </div>
            </div>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 z-50">
                <PrimaryButton label={isOpen ? 'Close AI' : 'Ask AI'} onClick={() => setIsOpen(!isOpen)} />
            </div>
        </>
    );
};
