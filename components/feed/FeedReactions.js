/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { IoAdd } from 'react-icons/io5';

export default function FeedReactions({ impressions, loading, onToggle, currentUser }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [prompt, setPrompt] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const timers = useRef([]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
    const flash = (message) => { setFeedback(message); later(() => setFeedback(null), 2000); };

    if (loading) return <div className="tag-bs-post__wait">Loading reactions...</div>;
    if (!impressions || impressions.length === 0) return null;

    const ordered = [...impressions].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const used = ordered.filter((imp) => (imp.count || 0) > 0);

    const react = async (impression) => {
        if (!currentUser) {
            setPrompt(true);
            later(() => setPrompt(false), 2500);
            return;
        }
        setOpen(false);
        const result = await onToggle(impression.id, currentUser.id);
        if (result?.success) flash(`${impression.emoji} ${result.removed ? 'removed' : 'added'}!`);
        else if (result?.error) flash(`Error: ${result.error}`);
    };

    return (
        <div className="tag-bs-post__reacts">
            {used.map((imp) => (
                <button key={imp.id} type="button" className="tag-bs-post__react" aria-label={`${imp.label || imp.name} ${imp.count}`} onClick={() => react(imp)}>
                    <span className="tag-bs-post__emoji">{imp.emoji}</span>
                    <span className="tag-bs-post__count">{imp.count}</span>
                </button>
            ))}
            <button type="button" className="tag-bs-post__react tag-bs-post__react--add" aria-expanded={open} aria-label={used.length ? 'Add a reaction' : undefined} onClick={() => setOpen(!open)}>
                <IoAdd aria-hidden="true" />
                {!used.length && <span>React</span>}
            </button>
            <div className="tag-bs-post__palette" hidden={!open}>
                {ordered.map((imp) => (
                    <button key={imp.id} type="button" className="tag-bs-post__pick" aria-label={`React ${imp.label || imp.name}`} onClick={() => react(imp)}>
                        {imp.emoji}
                    </button>
                ))}
            </div>
            {prompt && (
                <div className="tag-bs-post__prompt" role="status">
                    <span>Please log in to react</span>
                    <button type="button" onClick={() => router.push('/api/auth/signin')}>Log In</button>
                </div>
            )}
            {feedback && <div className="tag-bs-post__feedback" role="status">{feedback}</div>}
        </div>
    );
}
