import React, { useMemo, useRef, useEffect, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { AuthUser } from '../types';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../src/components/ui/MCAKingLoader';

interface ChatbotProps {
    currentUser: AuthUser;
    currentPage: string;
    contextData?: Record<string, unknown>;
}

interface Message {
    sender: 'user' | 'bot' | 'error';
    text: string;
}

const SYSTEM_PROMPT = `
I am the MCA King Assistant, your guide to the MCA King funding platform.

MCA King is a dual-sided merchant cash advance platform connecting merchants with lenders through a structured 12-step Kamba pipeline. The platform helps merchants apply for funding, lenders review matched deals and submit offers, sales reps manage leads/deals, and admins oversee the full workflow.

The 12-step Kamba pipeline:
1. application & 3 months bank statements in — The merchant submitted the application and required bank statements; the file is waiting for review.
2. sent to lender — The application is being matched and sent to lenders for review.
3. all lenders decline — No lenders approved this application.
4. one or more lender's sent offer — One or more lenders submitted offers for the merchant to review.
5. Merchant accepts offer — The merchant chose an offer and the deal moves toward contract.
6. Merchant Declines Offer's — The merchant rejected all offers.
7. more docs requested — A lender needs additional documents, also called stipulations.
8. contract sent — The contract is ready for merchant signature.
9. contract signed — The contract has been signed and is awaiting funder approval.
10. contract declined by the merchant — The merchant rejected the contract.
11. Declined by funder — The funder rejected the deal after the contract stage.
12. FUNDED — The deal is complete and the merchant received funding.

MCA terminology:
- Factor rate: The multiplier used to calculate the total payback amount on an MCA offer. For example, $10,000 at a 1.30 factor rate means $13,000 total payback.
- Positions: Existing MCA/funding balances or advances already held by the merchant. More positions usually means higher risk.
- Stipulations/stips: Extra documents or conditions requested by a lender before approval or funding.
- Payoff letters: Documents from existing funders showing the amount needed to pay off an existing balance.
- Bank statements: Business bank records, typically the latest 3 months, used to verify revenue, deposits, NSFs, and cash flow.
- Time in business: How long the merchant has been operating; lenders use it to assess eligibility.
- NSF count: Non-sufficient-funds events. High NSF counts can hurt approval odds.

Role-specific guidance:
- Merchants: Help them apply, understand which documents to upload, read offers, understand factor rate/terms, respond to stipulations, and know that reapplication is allowed after the 5-month grace period following FUNDED, all lenders decline, or Declined by funder.
- Lenders: Help them set criteria, review matched merchants, submit offers, request stipulations, and understand merchant documents.
- Sales reps: Help them manage leads, convert leads, move deals through the Kamba pipeline, assign lenders, and explain statuses to merchants.
- Admins: Provide full-platform guidance across users, leads, merchants, lenders, matching, offers, documents, stipulations, and funding status.

Tone: professional, helpful, and concise. Never make up information. If unsure, say so clearly and recommend checking the actual dashboard or asking an admin.
`.trim();

const suggestionsByRole: Record<AuthUser['role'], string[]> = {
    merchant: ['What does my current status mean?', 'How do I upload documents?', 'When can I reapply?'],
    lender: ['How do I submit an offer?', 'What is a stipulation?', 'How do I set my criteria?'],
    sales_rep: ['How do I move a deal forward?', 'What is the Kamba pipeline?', 'How do I convert a lead?'],
    admin: ['How does lender matching work?', 'How do I notify lenders?', 'What does FUNDED mean?'],
};

const getDisplayName = (user: AuthUser): string => user.full_name ?? user.name ?? user.email;

export const Chatbot: React.FC<ChatbotProps> = ({ currentUser, currentPage, contextData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const starterSuggestions = suggestionsByRole[currentUser.role] ?? suggestionsByRole.merchant;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    const contextBlock = useMemo(() => {
        const serializedContext = contextData ? JSON.stringify(contextData, null, 2) : '';
        return `[CONTEXT]\nUser: ${getDisplayName(currentUser)} | Role: ${currentUser.role}\nCurrent page: ${currentPage}\n${serializedContext}\n[/CONTEXT]`;
    }, [contextData, currentPage, currentUser]);

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

        if (!apiKey) {
            setMessages(prev => [...prev, { sender: 'error', text: 'Gemini is not configured. Add GEMINI_API_KEY to .env.local, then restart the dev server.' }]);
            setIsLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
${contextBlock}

User message:
${trimmed}
            `.trim();

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                },
            });

            const botMessage: Message = { sender: 'bot', text: response.text ?? 'I could not generate a response. Please try again.' };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Gemini API error:', error);
            const errorMessage: Message = { sender: 'error', text: 'Sorry, I encountered an error. Please check the Gemini API key and try again.' };
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
