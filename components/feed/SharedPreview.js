/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source - low-profit - human-first*/

import Image from 'next/image';
import Link from 'next/link';
import longDateOptions from '@/utils/longdateoptions';
import useEntityLogo from '@/components/cards/useEntityLogo';

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
    const item = preview || {};
    const nestedEntity = item.artist || item.vendor || item.venue || item.event || item.authorArtist || item.authorUser || {};
    const normalizedType = String(item.type || '').toLowerCase();
    const logoEntityType = item.logoEntityType || (item.artist || item.authorArtist ? 'artist' : item.vendor ? 'vendor' : item.venue ? 'venue' : item.event || normalizedType === 'event' ? 'event' : '');
    const logoEntityId = item.logoEntityId || nestedEntity.artistID || nestedEntity.ArtistID || nestedEntity.vendorID || nestedEntity.VendorID || nestedEntity.venueID || nestedEntity.VenueID || nestedEntity.eventID || nestedEntity.EventID || item.eventID || '';
    const logoImage = item.logoPic?.url || item.logoPic?.URL || item.logoPic?.normalizedURL || item.logoPic?.NormalizedURL || item.logo?.url || item.logo?.URL || item.logoUrl || item.logoURL || nestedEntity.logoPic?.url || nestedEntity.logoPic?.URL || nestedEntity.logoPic?.normalizedURL || nestedEntity.logoPic?.NormalizedURL || nestedEntity.logo?.url || nestedEntity.logo?.URL || '';
    const brandLogo = useEntityLogo({ logoImage, entityType: logoEntityType, entityId: logoEntityId });
    if (!preview) return null;

    const href = item.path || item.href || '#';
    const typeLabel = String(item.type || 'Post').trim() || 'Post';
    const image = resolvePreviewImage(item);

    return (
        <Link href={href} className="block mt-3 rounded-box border border-base-300 bg-base-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex gap-3 p-3">
                {image && (
                    <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-base-300">
                        <Image src={image} alt={item.title || ''} fill className="object-cover" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                        {brandLogo ? <Image src={brandLogo} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded object-contain bg-base-100" /> : null}
                        <p className="font-bold text-sm text-primary truncate">{item.title || 'Untitled'}</p>
                    </div>
                    {item.byline && <p className="text-xs text-base-content/60 truncate">{item.byline}</p>}
                    {item.artistName && <p className="text-xs text-base-content/60">by {item.artistName}</p>}
                    {item.venue && <p className="text-xs text-base-content/60">{item.venue}</p>}
                    {item.price != null && <p className="text-xs font-mono text-success">${Number(item.price).toFixed(2)}</p>}
                    {item.startTime && <p className="text-xs text-base-content/50">{new Date(item.startTime).toLocaleDateString('en-US', longDateOptions)}</p>}
                </div>
                <span className="badge badge-xs badge-outline self-start">{typeLabel}</span>
            </div>
        </Link>
    );
}