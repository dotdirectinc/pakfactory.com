'use client';

import {createContext, useContext, type ReactNode} from 'react';
import type {ChatSettings} from '@/lib/chat/chat-provider';

const ChatSettingsContext = createContext<ChatSettings>({intercomEnabled: false, intercomAppId: null});

/** Global Settings → Integrations, read once in the root layout. */
export function ChatSettingsProvider({value, children}: {value: ChatSettings; children: ReactNode}) {
    return <ChatSettingsContext.Provider value={value}>{children}</ChatSettingsContext.Provider>;
}

export function useChatSettings(): ChatSettings {
    return useContext(ChatSettingsContext);
}
