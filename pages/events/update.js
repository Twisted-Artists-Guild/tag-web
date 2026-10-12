/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/



import DynaFormDB from "@/components/widgets/DynaFormDB"
import TagSEO from "@/components/TagSEO"
import serverFetch from "@/libs/serverFetch"
import GalleryManager from "@/components/gallery/GalleryManager"

//broken but don't care!!!!
/**
 * Component for updating user details.
 * @param {Object} props
 * @param {Object} props.data
 * @param {Object} props.metadata
 * @returns {JSX.Element}
 */
export default function UpdateEventForm1(props) {
    props.metadataProp.FromURL = "/events/" + props.slug + "/update.js";
    props.metadataProp.redirectURL = "/events/" + props.slug;
    props.metadataProp.APIURL = `/api/${props.metadataProp.apiurlpostfix}/${props.slug}`;
    return (
        <div className="p-4">
            <TagSEO
                metadataProp={{
                    title: "Update Event",
                    description: "Update an existing event listing.",
                    robots: "noindex, nofollow",
                    keywords: "events, update event",
                    og: {
                        title: "Update Event",
                        description: "Update an existing event listing.",
                    },
                }}
                canonicalSlug="events/update"
            />
            <DynaFormDB request="update" metadataProp={props.metadataProp} formData={props.eventdata} />
            {(props.eventdata?.eventID || props.eventdata?.EventID || props.eventdata?.eventnum) ? (
                <GalleryManager
                    entityType="event"
                    entityId={props.eventdata.eventID || props.eventdata.EventID || props.eventdata.eventnum}
                    entityLabel={props.eventdata.title || props.eventdata.name || "Event"}
                    folderKind="logo"
                    title="Event Logo Manager"
                    allowVideo={false}
                    singleImageMode
                    allowDeleteSingleImage
                />
            ) : null}
        </div>
    );
}

/**
 * Get initial props for component.
 * @async
 * @param {Object} context
 * @returns {Object}
 */
UpdateEventForm1.getInitialProps = async function (context) {
    const { slug } = context.query;
    if (!slug) {
        return { error: { message: "Event slug is missing from context query" } };
    }
    let data = {};
    let metadata = {};
    try {
        const eventId = Number(slug);
        const eventPath = Number.isInteger(eventId) && eventId > 0
            ? `/event/byID/${eventId}`
            : `/event/${encodeURIComponent(slug)}`;
        const res1 = await serverFetch(eventPath);
        data = await res1.json();
        const res2 = await serverFetch(`/forms_metadata/EventForm1`);
        metadata = await res2.json();
    } catch (error) {
        console.error("Error fetching form meta or field data:", error);
    }
    return {
        eventdata: data,
        slug: slug,
        metadataProp: metadata
    };
};
