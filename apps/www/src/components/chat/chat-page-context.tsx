'use client';

import {useEffect} from 'react';
import {setChatContext, type ChatContext} from '@/lib/chat/chat-context';

/**
 * Drop into a server-rendered page to tell the chat what the page is about. Sets the context on
 * mount and clears it on unmount. Renders nothing.
 */
export function ChatPageContext({context}: {context: ChatContext}) {
    const key = JSON.stringify(context);
    useEffect(() => {
        setChatContext(JSON.parse(key) as ChatContext);
        return () => setChatContext(null);
    }, [key]);
    return null;
}
