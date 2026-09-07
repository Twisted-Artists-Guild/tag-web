/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source - low-profit - human-first*/

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import TagSEO from '@/components/TagSEO';
import BloomscrollVineRail from '@/components/art/bloomscroll-vine-rail';
import FeedPostCard from '@/components/feed/FeedPostCard';
import FeedComposer from '@/components/feed/FeedComposer';
import {
    IoFlowerOutline,
    IoTimeOutline,
    IoTrendingUpOutline,
    IoArrowBackOutline,
} from 'react-icons/io5';

const ALGORITHMS = [
    { key: 'latest', label: 'Latest', icon: IoTimeOutline },
    { key: 'trending', label: 'Trending', icon: IoTrendingUpOutline },
];

// ── Single Post View (when ?post=ID is in URL) ───────────────────────
const SinglePostView = ({ postId }) => {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetch('/api/Feed/' + postId);
                if (res.ok) {
                    setPost(await res.json());
                }
            } catch (err) {
                console.error('Failed to load post', err);
            }
            setLoading(false);
        };
        fetchPost();
    }, [postId]);

    if (loading) {
        return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    }

    if (!post) {
        return (
            <div className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body items-center text-center py-12">
                    <IoFlowerOutline className="text-5xl text-base-content/20 mb-3" />
                    <p className="text-base-content/50 text-lg">Post not found</p>
                    <Link href="/feed" className="btn btn-primary btn-sm mt-4">Back to Feed</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Link href="/feed" className="btn btn-ghost btn-sm gap-1">
                <IoArrowBackOutline /> Back to Bloomscroll
            </Link>
            <FeedPostCard post={post} showIdentityGlow={false} />
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
// ── Main Feed Page ──────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════
export default function BloomscrollFeed() {
    const { data: session } = useSession();
    const router = useRouter();
    const { post: singlePostId } = router.query;

    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [algorithm, setAlgorithm] = useState('latest');

    const observerRef = useRef(null);

    const fetchPosts = useCallback(async (pageNum, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams({ page: pageNum, pageSize: 20, algorithm });
            const res = await fetch('/api/Feed?' + params.toString());
            if (res.ok) {
                const data = await res.json();
                setPosts(prev => append ? [...prev, ...(data.items || [])] : (data.items || []));
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to load feed', err);
        }
        setLoading(false);
        setLoadingMore(false);
    }, [algorithm]);

    useEffect(() => {
        if (!singlePostId) {
            setPage(1);
            fetchPosts(1, false);
        }
    }, [fetchPosts, singlePostId]);

    // Infinite scroll
    useEffect(() => {
        if (singlePostId || !observerRef.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchPosts(nextPage, true);
            }
        }, { threshold: 0.5 });
        observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [page, totalPages, loadingMore, fetchPosts, singlePostId]);

    const handlePostCreated = () => {
        setPage(1);
        fetchPosts(1, false);
    };

    // If ?post=ID is in URL, show single post view
    if (singlePostId) {
        return (
            <div className="relative isolate min-h-screen bg-base-200 text-base-content bloomscroll-shell">
                <div className="bloomscroll-rail-slot left">
                    <BloomscrollVineRail side="left" />
                </div>
                <div className="bloomscroll-main-column">
                    <div className="min-h-screen bg-base-200">
                        <TagSEO metadataProp={{ title: "Post - Bloomscroll", description: "A post on TAG Bloomscroll" }} canonicalSlug={'feed?post=' + singlePostId} />
                        <div className="container mx-auto px-4 py-8 max-w-2xl">
                            <SinglePostView postId={singlePostId} />
                        </div>
                    </div>
                </div>
                <div className="bloomscroll-rail-slot right">
                    <BloomscrollVineRail side="right" />
                </div>

                <style jsx>{`
                    .bloomscroll-shell {
                        --vine-rail-width: min(18vw, 9.5rem);
                        --vine-rail-gap: 1rem;
                        --bloomscroll-slot-width: calc(var(--vine-rail-width) + var(--vine-rail-gap));
                        display: grid;
                        grid-template-columns: var(--bloomscroll-slot-width) minmax(0, 1fr) var(--bloomscroll-slot-width);
                        width: calc(100% + (var(--bloomscroll-slot-width) * 2));
                        margin-left: calc(-1 * var(--bloomscroll-slot-width));
                    }

                    .bloomscroll-rail-slot {
                        min-width: 0;
                        display: flex;
                        z-index: 0;
                    }

                    .bloomscroll-rail-slot.left {
                        grid-column: 1;
                        justify-content: flex-start;
                        padding-right: var(--vine-rail-gap);
                    }

                    .bloomscroll-rail-slot.right {
                        grid-column: 3;
                        justify-content: flex-end;
                        padding-left: var(--vine-rail-gap);
                    }

                    .bloomscroll-main-column {
                        grid-column: 2;
                        display: flex;
                        flex-direction: column;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="relative isolate min-h-screen bg-base-200 text-base-content bloomscroll-shell">
            <div className="bloomscroll-rail-slot left">
                <BloomscrollVineRail side="left" />
            </div>
            <div className="bloomscroll-main-column">
                <TagSEO metadataProp={{ title: "Bloomscroll", description: "Your creative social feed on TAG" }} canonicalSlug="feed" />
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
                            <div style={{
                              filter: 'drop-shadow(0 1px 3px rgba(21, 19, 24, 0.6)) drop-shadow(0 4px 12px color-mix(in srgb, var(--color-primary, #6233FF) 85%, transparent))',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <Image
                                src="/BLOOMSCROLL OFFICIAL/LOGO/BLOOMSCROLL - PLANTS.png"
                                alt="Bloomscroll"
                                width={40}
                                height={40}
                              />
                            </div>
                            Bloomscroll
                        </h1>
                        <div className="flex gap-1">
                            {ALGORITHMS.map(algo => (
                                <button
                                    key={algo.key}
                                    className={'btn btn-sm gap-1 ' + (algorithm === algo.key ? 'btn-primary' : 'btn-ghost')}
                                    onClick={() => setAlgorithm(algo.key)}
                                >
                                    <algo.icon /> {algo.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compose */}
                    {session?.user && (
                        <FeedComposer session={session} onPostCreated={handlePostCreated} />
                    )}

                    {/* Feed Posts */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>
                        ) : posts.length === 0 ? (
                            <div className="card bg-base-100 border border-base-300 shadow-sm">
                                <div className="card-body items-center text-center py-12">
                                    <IoFlowerOutline className="text-5xl text-base-content/20 mb-3" />
                                    <p className="text-base-content/50 text-lg">The feed is quiet... be the first to bloom!</p>
                                </div>
                            </div>
                        ) : posts.map(post => (
                            <FeedPostCard key={post.feedPostID} post={post} showIdentityGlow={false} />
                        ))}

                        {/* Infinite scroll sentinel */}
                        {page < totalPages && (
                            <div ref={observerRef} className="flex justify-center py-4">
                                {loadingMore && <span className="loading loading-spinner text-primary"></span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="bloomscroll-rail-slot right">
                <BloomscrollVineRail side="right" />
            </div>

            <style jsx>{`
                .bloomscroll-shell {
                    --vine-rail-width: min(18vw, 9.5rem);
                    --vine-rail-gap: 1rem;
                    --bloomscroll-slot-width: calc(var(--vine-rail-width) + var(--vine-rail-gap));
                    display: grid;
                    grid-template-columns: var(--bloomscroll-slot-width) minmax(0, 1fr) var(--bloomscroll-slot-width);
                    width: calc(100% + (var(--bloomscroll-slot-width) * 2));
                    margin-left: calc(-1 * var(--bloomscroll-slot-width));
                }

                .bloomscroll-rail-slot {
                    min-width: 0;
                    display: flex;
                    z-index: 0;
                }

                .bloomscroll-rail-slot.left {
                    grid-column: 1;
                    justify-content: flex-start;
                    padding-right: var(--vine-rail-gap);
                }

                .bloomscroll-rail-slot.right {
                    grid-column: 3;
                    justify-content: flex-end;
                    padding-left: var(--vine-rail-gap);
                }

                .bloomscroll-main-column {
                    grid-column: 2;
                    display: flex;
                    flex-direction: column;
                }
            `}</style>
        </div>
    );
}