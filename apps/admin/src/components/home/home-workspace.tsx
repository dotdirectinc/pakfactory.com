'use client';

import {useEffect, useRef, useState} from 'react';
import {GeneratedDashboard} from '@/components/home/generated-dashboard';
import {GeneratingMosaic} from '@/components/home/generating-mosaic';
import {Greeting} from '@/components/home/greeting';
import {InsightGrid} from '@/components/home/insight-grid';
import {PakAiPanel} from '@/components/home/pak-ai-panel';
import type {AdminHomePillId} from '@/lib/copy/home';
import {
    PAK_AI_PRESETS,
    resolvePakAiPreset,
    type PakAiPresetId,
} from '@/lib/home/pak-ai-presets';

type Phase = 'idle' | 'generating' | 'ready';

const GENERATE_MS = 2000;

export function HomeWorkspace({displayName}: {displayName: string}) {
    const [prompt, setPrompt] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [activePresetId, setActivePresetId] = useState<PakAiPresetId | null>(
        null,
    );
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    function runGenerate(presetId: PakAiPresetId, label: string) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPrompt(label);
        setPhase('generating');
        setActivePresetId(null);
        timerRef.current = setTimeout(() => {
            setActivePresetId(presetId);
            setPhase('ready');
            timerRef.current = null;
        }, GENERATE_MS);
    }

    function handlePill(id: AdminHomePillId) {
        const preset = PAK_AI_PRESETS[id];
        runGenerate(preset.id, preset.label);
    }

    function handleSubmitAsk() {
        const trimmed = prompt.trim();
        if (!trimmed || phase === 'generating') return;
        const presetId = resolvePakAiPreset(trimmed);
        runGenerate(presetId, trimmed);
    }

    function handleReset() {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPhase('idle');
        setActivePresetId(null);
        setPrompt('');
    }

    const busy = phase === 'generating';

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-col items-center gap-8 pt-24 pb-20">
                <Greeting displayName={displayName} />
                <PakAiPanel
                    value={prompt}
                    onChange={setPrompt}
                    onSubmitAsk={handleSubmitAsk}
                    onPill={handlePill}
                    busy={busy}
                />
            </div>
            <div className="min-h-[22rem] flex-1 pb-8">
                {phase === 'generating' ? (
                    <GeneratingMosaic />
                ) : phase === 'ready' && activePresetId ? (
                    <GeneratedDashboard
                        presetId={activePresetId}
                        onReset={handleReset}
                    />
                ) : (
                    <InsightGrid />
                )}
            </div>
        </div>
    );
}
