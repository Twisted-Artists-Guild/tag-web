/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import React from 'react';

// Also shown in the footer
export const MISSION_STATEMENT = "We aim to foster a community in which independent artists thrive through technical innovation, sustainable practices, and creative entrepreneurship.";

/**
 * MissionStatement component to elegantly display the organization's mission.
 * @returns {JSX.Element} MissionStatement card
 */
const MissionStatement = () => {
  return (
    <div className="card bg-base-100 shadow-xl p-4 text-center border border-primary">
      <h3 className="text-1xl font-extrabold mb-1 text-primary font-serif">Mission Statement</h3>
      <p className="text-base text-base-content">{MISSION_STATEMENT}</p>
    </div>
  );
};

export default MissionStatement;
