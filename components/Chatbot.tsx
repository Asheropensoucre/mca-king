import React, { useRef, useEffect, useState } from 'react';
import type { AuthUser } from '../types';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../src/components/ui/MCAKingLoader';
import { csrfHeaders } from '../src/lib/client-security';

interface ChatbotProps {
    currentUser: AuthUser;
    currentPage: string;
    contextData?: Record<string, unknown>;
}

interface Message {
    sender: 'user' | 'bot' | 'error';
    text: string;
}

type ChatResponse = {
    text?: string;
    error?: string;
}

const suggestionsByRole: Record<AuthUser['role'], string[]> = {
    merchant: ['What does my current status mean?', 'How do I upload documents?', 'When can I reapply?'],
    lender: ['How do I submit an offer?', 'What is a stipulation?', 'How do I set my criteria?'],
    sales_rep: ['How do I move a deal forward?', 'What is the Kamba pipeline?', 'How do I convert a lead?'],
    admin: ['How does lender matching work?', 'How do I notify lenders?', 'What does FUNDED mean?'],
};

export const Chatbot: React.FC<ChatbotProps> = ({ currentUser, currentPage, contextData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const starterSuggestions = suggestionsByRole[currentUser.role] ?? suggestionsByRole.merchant;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        const userMessage: Message = { sender: 'user', text: trimmed };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
                body: JSON.stringify({
                    message: trimmed,
                    currentPage,
                    contextData,
                }),
            });

            const data = await response.json() as ChatResponse;

            if (!response.ok) {
                setMessages(prev => [...prev, { sender: 'error', text: data.error ?? 'MCA King Assistant is unavailable. Please try again.' }]);
                return;
            }

            const botMessage: Message = { sender: 'bot', text: data.text ?? 'I could not generate a response. Please try again.' };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('MCA King Assistant API error:', error);
            const errorMessage: Message = { sender: 'error', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        void sendMessage(input);
    };

    return (
        <>
            <div className={`fixed bottom-24 right-4 sm:right-8 w-80 sm:w-96 h-[500px] bg-white dark:bg-dark-card shadow-2xl rounded-lg border-2 border-theme-yellow dark:border-theme-yellow flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'transform translate-y-0 opacity-100' : 'transform translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-center p-4 border-b-2 border-theme-yellow bg-theme-primary dark:bg-theme-primary-container rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-theme-tertiary-fixed text-theme-on-tertiary-fixed text-lg font-black">👑</div>
                        <div>
                            <h3 className="font-black text-base text-theme-on-primary dark:text-theme-tertiary-fixed">MCA King Assistant</h3>
                            <p className="text-xs font-semibold text-theme-inverse-primary dark:text-theme-secondary-fixed">{currentPage}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-theme-on-primary hover:text-theme-tertiary-fixed dark:text-theme-inverse-on-surface" aria-label="Close MCA King Assistant">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <div className="p-3 rounded-lg bg-theme-secondary-fixed/40 text-sm text-slate-700 dark:text-slate-300 border border-theme-secondary">
                        <p className="font-black text-theme-primary dark:text-theme-tertiary-fixed">Hello — I am the MCA King Assistant.</p>
                        <p>I can help with applications, offers, stipulations, lender matching, and the 12-step Kamba pipeline.</p>
                    </div>

                    {messages.length === 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-wider text-theme-secondary dark:text-theme-secondary-fixed">Quick questions</p>
                            {starterSuggestions.map(suggestion => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => void sendMessage(suggestion)}
                                    className="block w-full rounded-lg border border-theme-outline-variant bg-theme-surface-container-low px-3 py-2 text-left text-xs font-bold text-theme-on-surface hover:border-theme-secondary dark:bg-theme-primary-container dark:text-theme-inverse-on-surface"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                                msg.sender === 'user' ? 'bg-theme-tertiary-fixed text-theme-on-tertiary-fixed' : 
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

                <div className="p-4 border-t-2 border-theme-yellow dark:border-theme-yellow">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask MCA King Assistant..."
                            disabled={isLoading}
                            className="flex-1 block w-full rounded-md border-0 py-2.5 px-4 text-slate-800 bg-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-theme-yellow dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-theme-yellow"
                            aria-label="Chat message"
                        />
                        <PrimaryButton type="submit" label="Send" size="small" disabled={isLoading} />
                    </form>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-50">
                <PrimaryButton label={isOpen ? 'Close AI' : 'Ask AI'} onClick={() => setIsOpen(!isOpen)} />
            </div>
        </>
    );
};
