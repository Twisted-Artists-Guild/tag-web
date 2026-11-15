import { BlobServiceClient } from "@azure/storage-blob";
import formidable from "formidable";
import fs from "fs";
import serverFetch from "@/libs/serverFetch";
import { authorizeVenueMediaChange, getVenueImageMaxBytes, getVenueMediaTarget, validateVenueImage } from "@/utils/venue-media";

const SAFE_SEGMENT_RE = /^[A-Za-z0-9_-]{1,64}$/;
const ALLOWED_PREFIX_RE = /^[A-Za-z0-9/_\-.]*$/;
const CONTAINER_ROOTS = {
    tagpictures: "platformpics/",
    platformpics: "",
};

async function readFileHeader(filepath, length = 16) {
    const handle = await fs.promises.open(filepath, "r");
    try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, 0);
        return Array.from(buffer.subarray(0, bytesRead));
    } finally {
        await handle.close();
    }
}

async function removeTempFile(file) {
    await fs.promises.unlink(file?.filepath).catch(() => null);
}

function normalizePrefix(value) {
    if (!value) return "";
    return String(value).replace(/^\/+/, "");
}

function sanitizeFilenamePart(value, fallback) {
    const sanitized = String(value || "")
        .replace(/[^A-Za-z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "")
        .slice(0, 120);
    return sanitized || fallback;
}

function normalizeResourceUrl(value) {
    return String(value || "").trim().toLowerCase();
}

function parseEntityId(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeScopeType(value) {
    const v = String(value || "").trim().toLowerCase();
    if (v === "artist" || v === "artists") return "artist";
    if (v === "blog" || v === "blogs") return "blog";
    if (v === "listing" || v === "listings") return "listing";
    return null;
}

function resolveEntityContext({ category, entityID, targetPrefix }) {
    const normalizedPrefix = normalizePrefix(targetPrefix || "");
    const isGalleryPath = /\/gallery\/?$/i.test(normalizedPrefix);

    // Preferred: infer from the folder structure itself.
    const pathMatch = normalizedPrefix.match(/(?:^|\/)platformpics\/(artist|artists|blog|blogs|listing|listings)\/(\d+)\/gallery\/?$/i)
        || normalizedPrefix.match(/(?:^|\/)(artist|artists|blog|blogs|listing|listings)\/(\d+)\/gallery\/?$/i);

    if (pathMatch) {
        const scopeType = normalizeScopeType(pathMatch[1]);
        const scopeEntityID = parseEntityId(pathMatch[2]);
        if (scopeType && scopeEntityID) {
            return { scopeType, scopeEntityID, isGalleryPath: true };
        }
    }

    // Fallback: infer from explicit category + entityID.
    const scopeType = normalizeScopeType(category);
    const scopeEntityID = parseEntityId(entityID);
    if (scopeType && scopeEntityID && isGalleryPath) {
        return { scopeType, scopeEntityID, isGalleryPath };
    }

    return null;
}

async function resolvePictureByUrl(normalizedURL) {
    const response = await fetch(`/api/picture`);
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows)) return null;

    return rows.find((row) => {
        const candidateUrl = normalizeResourceUrl(row?.URL || row?.url);
        const candidateNormalized = normalizeResourceUrl(row?.NormalizedURL || row?.normalizedURL);
        return candidateUrl === normalizedURL || candidateNormalized === normalizedURL;
    }) || null;
}

function getEntityReadEndpoint(category, entityId) {
    switch (category) {
        case "artist":
            return `/api/artist/byID/${entityId}`;
        case "blog":
            return `/api/blog/${entityId}`;
        case "listing":
            return `/api/listing/byID/${entityId}`;
        default:
            return null;
    }
}

function getEntityGalleryOrderEndpoint(category, entityId) {
    switch (category) {
        case "artist":
        case "blog":
        case "listing":
            return `/api/${category}/${entityId}/gallery/order`;
        default:
            return null;
    }
}

// Disable the default body parser to handle file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const form = formidable({});

    try {
        const [fields, files] = await form.parse(req);
        const file = files.file[0];

        // Extract the new fields
        const userID = fields.userID?.[0] || "unknown";
        const category = String(fields.category?.[0] || "general").trim().toLowerCase();
        const entityID = fields.entityID?.[0] || "default";
        const postfix = fields.postfix?.[0] || "";
        const requestedContainer = fields.container?.[0] || "tagpictures";
        const container = CONTAINER_ROOTS[requestedContainer] !== undefined ? requestedContainer : null;
        if (!container) {
            return res.status(400).json({ error: "Unsupported container" });
        }

        const containerRoot = CONTAINER_ROOTS[container];
        const requestedStartPrefix = normalizePrefix(fields.startPrefix?.[0] || "");
        const startPrefix = requestedStartPrefix || containerRoot;
        const requestedTargetPrefix = normalizePrefix(fields.targetPrefix?.[0] || "");
        const targetPrefixRaw = requestedTargetPrefix || startPrefix;
        const targetPrefix = targetPrefixRaw && !targetPrefixRaw.endsWith("/") ? `${targetPrefixRaw}/` : targetPrefixRaw;

        if (!ALLOWED_PREFIX_RE.test(startPrefix) || !ALLOWED_PREFIX_RE.test(targetPrefix)) {
            return res.status(400).json({ error: "Invalid upload prefix" });
        }

        if (startPrefix.includes("..") || targetPrefix.includes("..")) {
            return res.status(400).json({ error: "Invalid upload prefix path" });
        }

        if (containerRoot && !startPrefix.startsWith(containerRoot)) {
            return res.status(400).json({ error: `startPrefix must stay within ${containerRoot}` });
        }

        if (startPrefix && !targetPrefix.startsWith(startPrefix)) {
            return res.status(400).json({ error: `targetPrefix must stay within startPrefix ${startPrefix}` });
        }

        if (!SAFE_SEGMENT_RE.test(userID)) {
            return res.status(400).json({ error: "Invalid userID" });
        }

        // Uploading into a venue's folder is changing that venue's media: only its owners and staff may, and only
        // real images of an accepted type and size are kept there.
        const authorization = await authorizeVenueMediaChange({ req, blobNames: [targetPrefix, startPrefix], container, fetchApi: serverFetch });
        if (!authorization.ok) {
            await removeTempFile(file);
            return res.status(authorization.status).json({ error: authorization.error });
        }

        const venueTarget = getVenueMediaTarget(targetPrefix, container);
        if (venueTarget) {
            const problem = validateVenueImage({
                name: file.originalFilename,
                type: file.mimetype,
                size: file.size,
                folder: venueTarget.folder,
                header: await readFileHeader(file.filepath),
            });
            if (problem) {
                await removeTempFile(file);
                return res.status(file.size > getVenueImageMaxBytes(venueTarget.folder) ? 413 : 400).json({ error: problem });
            }
        }

        // Construct the filename with the postfix
        const originalName = file.originalFilename || "upload.bin";
        const nameParts = originalName.split('.');
        const extension = sanitizeFilenamePart(nameParts.pop(), "bin");
        const baseName = sanitizeFilenamePart(nameParts.join('.'), "upload");
        const safeEntityID = sanitizeFilenamePart(entityID, "default");
        const safePostfix = sanitizeFilenamePart(postfix, "");

        // 1. Connection string from your .env file
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = container;

        if (!AZURE_STORAGE_CONNECTION_STRING) {
            throw new Error("Azure Storage Connection String is missing");
        }

        // 2. Initialize Azure Client
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // 3. Upload to the current explorer directory (targetPrefix), constrained by startPrefix/root.
        const finalFileName = `${baseName}${safePostfix ? `-${safePostfix}` : ""}.${extension}`;
        const blobName = `${targetPrefix}${Date.now()}-${finalFileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // 4. Upload the binary data
        const fileStream = fs.createReadStream(file.filepath);
        await blockBlobClient.uploadStream(fileStream);

        // 5. Return the permanent URL
        // Make sure your container "Access Level" is set to "Blob" or "Container" in Azure Portal
        const url = blockBlobClient.url;

        // 6. Create a minimal Picture record for gallery/API consumers.
        const nowIso = new Date().toISOString();
        const normalizedURL = String(url || "").trim().toLowerCase();
        const picturePayload = {
            URL: url,
            NormalizedURL: normalizedURL,
            Path: targetPrefix,
            Title: baseName,
            Context: category || null,
            Created: nowIso,
            Updated: nowIso,
        };

        let metadataCreated = true;
        let metadataError = null;
        let persistedPictureId = null;
        try {
            const pictureRes = await fetch(`/api/picture`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(picturePayload),
            });

            if (!pictureRes.ok) {
                metadataCreated = false;
                metadataError = `Picture metadata create failed (${pictureRes.status})`;
                const resolved = await resolvePictureByUrl(normalizedURL);
                persistedPictureId = resolved?.PictureID || resolved?.pictureID || null;
            } else {
                const created = await pictureRes.json().catch(() => null);
                persistedPictureId = created?.PictureID || created?.pictureID || null;
            }
        } catch (metadataCreateError) {
            metadataCreated = false;
            metadataError = metadataCreateError?.message || "Picture metadata create failed";
            const resolved = await resolvePictureByUrl(normalizedURL).catch(() => null);
            persistedPictureId = resolved?.PictureID || resolved?.pictureID || null;
        }

        const entityContext = resolveEntityContext({ category, entityID, targetPrefix });
        const canSeedGallery = Boolean(entityContext?.scopeEntityID && entityContext?.scopeType && entityContext?.isGalleryPath && persistedPictureId);
        let galleryLinked = false;
        let galleryLinkError = null;

        if (canSeedGallery) {
            try {
            const readEndpoint = getEntityReadEndpoint(entityContext.scopeType, entityContext.scopeEntityID);
            const orderEndpoint = getEntityGalleryOrderEndpoint(entityContext.scopeType, entityContext.scopeEntityID);

                if (readEndpoint && orderEndpoint) {
                    const entityResponse = await fetch(readEndpoint);
                    if (entityResponse.ok) {
                        const entityData = await entityResponse.json();
                        const existingItems = Array.isArray(entityData?.gallery?.galleryItems)
                            ? entityData.gallery.galleryItems
                            : (Array.isArray(entityData?.gallery?.GalleryItems) ? entityData.gallery.GalleryItems : []);

                        if (existingItems.length === 0) {
                            const seedPayload = {
                                items: [
                                    {
                                        mediaType: "picture",
                                        pictureID: persistedPictureId,
                                        url,
                                    },
                                ],
                            };

                            const orderResponse = await fetch(orderEndpoint, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(seedPayload),
                            });

                            if (!orderResponse.ok) {
                                const orderError = await orderResponse.json().catch(() => ({}));
                                galleryLinkError = orderError?.message || orderError?.error || `Gallery seed failed (${orderResponse.status})`;
                            } else {
                                galleryLinked = true;
                            }
                        }
                    }
                }
            } catch (seedError) {
                galleryLinkError = seedError?.message || "Gallery seed failed";
            }
        }

        return res.status(200).json({
            url,
            metadataCreated,
            persistedPictureId,
            galleryLinked,
            ...(metadataError ? { metadataError } : {}),
            ...(galleryLinkError ? { galleryLinkError } : {}),
        });
    } catch (error) {
        console.error("Server-side Upload Error:", error);
        return res.status(500).json({ error: error.message });
    }
}