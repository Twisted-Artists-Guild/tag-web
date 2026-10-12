/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import DynaFormDB from "@/components/widgets/DynaFormDB";
import TagSEO from "@/components/TagSEO";
import serverFetch from "@/libs/serverFetch"

const formName = "EventForm1";
//broken but don't care!!!!

export default function CreateEventForm1(props) {
    props.metadataProp = props.metadataProp || {};
    props.metadataProp.FromURL = "/events/create.js";
    props.metadataProp.redirectURL = "/events/";
    props.metadataProp.APIURL = `/api/${props.metadataProp.apiurlpostfix}`;

    const continueToEventMedia = (responseData) => {
        const event = responseData?.event || responseData?.data || responseData;
        const eventSlug = event?.path || event?.slug || event?.eventPath || event?.EventPath;
        const eventId = event?.eventID || event?.EventID || event?.eventnum || event?.id;
        const eventKey = eventSlug || eventId;
        if (eventKey) {
            props.metadataProp.redirectURL = `/events/update?slug=${encodeURIComponent(String(eventKey))}`;
        }
    };

    return (
        <div className="p-4">
            <TagSEO
                metadataProp={{
                    title: "Create Event",
                    description: "Create a new event listing.",
                    robots: "noindex, nofollow",
                    keywords: "events, create event",
                    og: {
                        title: "Create Event",
                        description: "Create a new event listing.",
                    },
                }}
                canonicalSlug="events/create"
            />
            <DynaFormDB request="add" metadataProp={props.metadataProp} onPostSubmit={continueToEventMedia} />
        </div>
    );
}

CreateEventForm1.getInitialProps = async function () {
    let metadata = {};
    try {
        const res = await serverFetch(`/forms_metadata/${formName}`);
        metadata = await res.json();
    } catch (error) {
        console.error("Error fetching form meta:", error);
    }
    return {
        metadataProp: metadata
    };
}
