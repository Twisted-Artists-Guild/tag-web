/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

export const THIRD_SPANS = [1, 2, 3];

export const PANEL_SIZES = ["quarter", "third", "half", "twoThirds", "threeQuarters", "full"];

export const PANEL_SIZE_LABELS = {
  quarter: "1/4",
  third: "1/3",
  half: "1/2",
  twoThirds: "2/3",
  threeQuarters: "3/4",
  full: "3/3",
};

export const CARD_SHELL_CLASS =
  "card h-full bg-base-100 text-base-content border border-base-300 shadow-lg transition-all duration-300 hover:shadow-2xl";

export const CARD_SIZE_CLASSES = {
  xs: "gap-2 p-2",
  sm: "gap-3 p-3",
  md: "gap-4 p-4",
  lg: "gap-5 p-5",
};

export const CARD_ORIENTATION_CLASSES = {
  vertical: "flex-col",
  horizontal: "flex-row",
};

export const CARD_MEDIA_SIZE_CLASSES = {
  xs: "h-28",
  sm: "h-36",
  md: "h-48",
  lg: "h-60",
};

export const PANEL_SCROLL_CLASS = "min-h-0 overflow-auto overscroll-contain";

export const normalizeThirdSpan = (span) => {
  if (span === 2 || span === 3) {
    return span;
  }
  return 1;
};

export const normalizePanelSize = (size) => {
  if (PANEL_SIZES.includes(size)) {
    return size;
  }
  return "third";
};

export const getPanelClass = (size, isExpanded = false) => {
  const effectiveSize = isExpanded ? "full" : normalizePanelSize(size);

  if (effectiveSize === "full") {
    return "col-span-1 md:col-span-6 lg:col-span-12";
  }

  if (effectiveSize === "threeQuarters") {
    return "col-span-1 md:col-span-6 lg:col-span-9";
  }

  if (effectiveSize === "twoThirds") {
    return "col-span-1 md:col-span-4 lg:col-span-8";
  }

  if (effectiveSize === "half") {
    return "col-span-1 md:col-span-3 lg:col-span-6";
  }

  if (effectiveSize === "third") {
    return "col-span-1 md:col-span-2 lg:col-span-4";
  }

  return "col-span-1 md:col-span-3 lg:col-span-3";
};

export const getThirdSpanClass = (span, isExpanded = false) => {
  const effectiveSpan = normalizeThirdSpan(span);
  if (effectiveSpan === 3) {
    return getPanelClass("full", isExpanded);
  }

  if (effectiveSpan === 2) {
    return getPanelClass("twoThirds", isExpanded);
  }

  return getPanelClass("third", isExpanded);
};
