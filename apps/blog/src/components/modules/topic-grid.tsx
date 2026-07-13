'use client';

import Link from 'next/link';
import {useState, type ReactNode} from 'react';
import type {TopicGroup, TopicLink} from '@/lib/blog-topics-index';
import {tagHref} from '@/lib/blog-post-url';

/** >6 topics → two internal columns within one group block. */
export const TOPIC_BLOCK_TWO_COLUMN_THRESHOLD = 6;

/** Max topic links per internal column while collapsed. */
export const TOPICS_PER_COLUMN = 6;

/** Collapsed two-column block: max visible slots including "View all". */
export const TOPICS_COLLAPSED_MAX_VISIBLE = 12;

const topicLinkClass =
    'text-base leading-6 text-muted-foreground transition-colors hover:text-foreground';

const topicToggleClass = `${topicLinkClass} underline underline-offset-4 `;

const topicToggleButtonClass = `${topicToggleClass} cursor-pointer bg-transparent p-0 text-left text-foreground font-medium`;

type TopicBlockProps = {
    group: TopicGroup;
    expandedSlug?: string;
};

function TopicLinkItem({topic}: {topic: TopicLink}) {
    return (
        <li>
            <Link href={tagHref(topic.slug)} className={topicLinkClass}>
                {topic.title}
            </Link>
        </li>
    );
}

function TopicToggleButton({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onClick}
                className={topicToggleButtonClass}
            >
                {children}
            </button>
        </li>
    );
}

function syncGroupUrl(groupSlug: string | null) {
    const url = groupSlug
        ? `/topics?group=${encodeURIComponent(groupSlug)}`
        : '/topics';
    window.history.replaceState(null, '', url);
}

function splitIntoColumns(topics: TopicLink[]): [TopicLink[], TopicLink[]] {
    const midpoint = Math.ceil(topics.length / 2);
    return [topics.slice(0, midpoint), topics.slice(midpoint)];
}

function TopicTwoColumnGrid({
    left,
    right,
    toggle,
}: {
    left: TopicLink[];
    right: TopicLink[];
    toggle?: ReactNode;
}) {
    return (
        <div className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <ul className="flex flex-col gap-2.5">
                {left.map((topic) => (
                    <TopicLinkItem key={topic._id} topic={topic} />
                ))}
            </ul>
            <ul className="flex flex-col gap-2.5">
                {right.map((topic) => (
                    <TopicLinkItem key={topic._id} topic={topic} />
                ))}
                {toggle}
            </ul>
        </div>
    );
}

function collapsedTopics(topics: TopicLink[]): {
    columnOne: TopicLink[];
    columnTwo: TopicLink[];
    showViewAll: boolean;
} {
    if (topics.length <= TOPIC_BLOCK_TWO_COLUMN_THRESHOLD) {
        return {columnOne: topics, columnTwo: [], showViewAll: false};
    }

    if (topics.length < TOPICS_COLLAPSED_MAX_VISIBLE) {
        return {
            columnOne: topics.slice(0, TOPICS_PER_COLUMN),
            columnTwo: topics.slice(TOPICS_PER_COLUMN),
            showViewAll: false,
        };
    }

    return {
        columnOne: topics.slice(0, TOPICS_PER_COLUMN),
        columnTwo: topics.slice(
            TOPICS_PER_COLUMN,
            TOPICS_COLLAPSED_MAX_VISIBLE - 1,
        ),
        showViewAll: true,
    };
}

function TopicBlock({group, expandedSlug}: TopicBlockProps) {
    const [expanded, setExpanded] = useState(expandedSlug === group.value);
    const {topics} = group;
    const showToggle = topics.length >= TOPICS_COLLAPSED_MAX_VISIBLE;

    const {columnOne, columnTwo, showViewAll} = collapsedTopics(topics);

    const expandGroup = () => {
        setExpanded(true);
        syncGroupUrl(group.value);
    };

    const collapseGroup = () => {
        setExpanded(false);
        syncGroupUrl(null);
    };

    return (
        <div>
            <h2 className="text-xl font-medium leading-8 text-foreground">
                {group.title}
            </h2>
            {topics.length <= TOPIC_BLOCK_TWO_COLUMN_THRESHOLD ? (
                <ul className="mt-4 flex flex-col gap-2.5">
                    {topics.map((topic) => (
                        <TopicLinkItem key={topic._id} topic={topic} />
                    ))}
                </ul>
            ) : expanded ? (
                <TopicTwoColumnGrid
                    left={splitIntoColumns(topics)[0]}
                    right={splitIntoColumns(topics)[1]}
                    toggle={
                        showToggle ? (
                            <TopicToggleButton onClick={collapseGroup}>
                                Show less
                            </TopicToggleButton>
                        ) : undefined
                    }
                />
            ) : (
                <TopicTwoColumnGrid
                    left={columnOne}
                    right={columnTwo}
                    toggle={
                        showViewAll ? (
                            <TopicToggleButton onClick={expandGroup}>
                                View all
                            </TopicToggleButton>
                        ) : undefined
                    }
                />
            )}
        </div>
    );
}

type TopicsGridProps = {
    leftColumnGroups: TopicGroup[];
    rightColumnGroups: TopicGroup[];
    expandedSlug?: string;
};

export function TopicsGrid({
    leftColumnGroups,
    rightColumnGroups,
    expandedSlug,
}: TopicsGridProps) {
    return (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-12">
                {leftColumnGroups.map((group) => (
                    <TopicBlock
                        key={group.value}
                        group={group}
                        expandedSlug={expandedSlug}
                    />
                ))}
            </div>
            <div className="flex flex-col gap-12">
                {rightColumnGroups.map((group) => (
                    <TopicBlock
                        key={group.value}
                        group={group}
                        expandedSlug={expandedSlug}
                    />
                ))}
            </div>
        </div>
    );
}
