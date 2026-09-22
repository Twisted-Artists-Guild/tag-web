/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source - low-profit - human-first*/

import Image from 'next/image';
import Link from 'next/link';
import longDateOptions from '@/utils/longdateoptions';

const DEFAULT_PREVIEW_IMAGE = '/blank_image.png';

function resolvePreviewImage(preview) {
    const candidates = [
        preview.image,
        preview.imageUrl,
        preview.imageURL,
        preview.thumbnail,
        preview.thumbnailUrl,
        preview.thumbnailURL,
        preview.pictureURL,
        preview.coverImage,
        preview.heroImage,
        preview.profilePic?.url,
        preview.profilePic?.URL,
        preview.artist?.profilePic?.url,
        preview.artist?.profilePic?.URL,
        preview.vendor?.profilePic?.url,
        preview.vendor?.profilePic?.URL,
    ];

    return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim()) || DEFAULT_PREVIEW_IMAGE;
}

export default function SharedPreview({ preview }) {
    if (!preview) return null;

    const href = preview.path || preview.href || '#';
    const typeLabel = String(preview.type || 'Post').trim() || 'Post';
    const image = resolvePreviewImage(preview);

    return (
        <Link href={href} className="block mt-3 rounded-box border border-base-300 bg-base-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex gap-3 p-3">
                {image && (
                    <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-base-300">
                        <Image src={image} alt={preview.title || ''} fill className="object-cover" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary truncate">{preview.title || 'Untitled'}</p>
                    {preview.byline && <p className="text-xs text-base-content/60 truncate">{preview.byline}</p>}
                    {preview.artistName && <p className="text-xs text-base-content/60">by {preview.artistName}</p>}
                    {preview.venue && <p className="text-xs text-base-content/60">{preview.venue}</p>}
                    {preview.price != null && <p className="text-xs font-mono text-success">${Number(preview.price).toFixed(2)}</p>}
                    {preview.startTime && <p className="text-xs text-base-content/50">{new Date(preview.startTime).toLocaleDateString('en-US', longDateOptions)}</p>}
                </div>
                <span className="badge badge-xs badge-outline self-start">{typeLabel}</span>
            </div>
        </Link>
    );
}