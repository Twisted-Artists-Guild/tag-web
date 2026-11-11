import { useRouter } from "next/router";
import { stripHtmlText } from "@/components/security/sanitize";
import serverFetch from "@/libs/serverFetch";

export async function fetchArtistListings(artistId) {
    if (!Number.isSafeInteger(Number(artistId)) || Number(artistId) <= 0) {
        throw new Error("The selected artist has no valid ID.");
    }

    const response = await serverFetch(`/listing/artist/${artistId}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Listings request failed (${response.status}).`);

    const listings = await response.json();
    if (!Array.isArray(listings) || listings.some((listing) => {
        const id = Number(listing?.listingID || listing?.ListingID);
        return !Number.isSafeInteger(id) || id <= 0;
    })) {
        throw new Error("Invalid artist listings response.");
    }
    return listings;
}

export default function ListingSelector({ artistSlug, listingId, currentListing, listings = [], error }) {
    const router = useRouter();
    const selectedValue = listingId ? String(listingId) : "create";
    const listingOptions = Array.from(new Map(
        [...(currentListing ? [currentListing] : []), ...listings].map((listing) => [
            String(listing.listingID || listing.ListingID),
            listing,
        ])
    ).values());

    return (
        <div className="form-control max-w-md mb-6">
            <label className="label" htmlFor="listing-selector">
                <span className="label-text">Select a listing</span>
            </label>
            <select
                id="listing-selector"
                className="select select-bordered w-full"
                value={selectedValue}
                onChange={(event) => {
                    const value = event.target.value;
                    if (value === selectedValue) return;
                    const artistPath = `/portal/artist/${encodeURIComponent(artistSlug)}/listing`;
                    router.push(value === "create" ? `${artistPath}/create` : `${artistPath}/update/${value}`);
                }}
            >
                {listingOptions.map((listing) => {
                    const id = String(listing.listingID || listing.ListingID);
                    const title = stripHtmlText(String(listing.title || listing.Title || "")) || `Listing #${id}`;
                    return <option key={id} value={id}>{title}</option>;
                })}
                <option value="create">Create new listing</option>
            </select>
            {error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}
        </div>
    );
}
