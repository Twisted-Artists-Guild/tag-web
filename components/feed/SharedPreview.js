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
        <Link href={href} className="tag-bs-post__share">
            {image && (
                <span className="tag-bs-post__share-pic">
                    <Image src={image} alt={item.title || ''} fill className="object-cover" />
                </span>
            )}
            <span className="tag-bs-post__share-text">
                <span className="tag-bs-post__share-title">
                    {brandLogo ? <Image src={brandLogo} alt="" width={20} height={20} className="tag-bs-post__share-logo" /> : null}
                    <span>{item.title || 'Untitled'}</span>
                </span>
                {item.byline && <span className="tag-bs-post__share-by">{item.byline}</span>}
                {item.artistName && <span className="tag-bs-post__share-by">by {item.artistName}</span>}
                {item.venue && <span className="tag-bs-post__share-by">{item.venue}</span>}
                {item.price != null && <span className="tag-bs-post__share-price">${Number(item.price).toFixed(2)}</span>}
                {item.startTime && <span className="tag-bs-post__share-by">{new Date(item.startTime).toLocaleDateString('en-US', longDateOptions)}</span>}
            </span>
            <span className="tag-bs-post__share-type">{typeLabel}</span>
        </Link>
    );
}
