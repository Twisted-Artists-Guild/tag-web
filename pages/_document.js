/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
import { Html, Head, Main, NextScript } from "next/document";
import config from "@/config";
import { DAISY_THEME_BY_MODE, DEFAULT_PREFS, MODES, PALETTES, STORAGE_KEYS } from "@/components/Header/PalettePicker";
import { DEV_BANNER_DISMISS_KEY, NOTICE_HIDDEN_CLASS } from "@/components/NoticeBar";

export default function Document() {
  const ghlTrackingId = process.env.NEXT_PUBLIC_GHL_TRACKING_ID;
  const themeConfig = JSON.stringify({ keys: STORAGE_KEYS, allowed: { palette: PALETTES, mode: MODES }, defaults: DEFAULT_PREFS, daisy: DAISY_THEME_BY_MODE });

  // Runs before first paint: restores the saved palette and mode (moving the old `theme` key over),
  // marks <html> with tag-js for the scroll reveal, and hides a dismissed notice bar.
  const headScript = `(function(){try{var c=${themeConfig},s=localStorage,r=document.documentElement;`
    + `try{var l=s.getItem(c.keys.legacy);if(l!==null){if(s.getItem(c.keys.mode)===null)s.setItem(c.keys.mode,l==="light"?"light":"dark");s.removeItem(c.keys.legacy);}}catch(e){}`
    + `var p=c.defaults.palette,m=c.defaults.mode;`
    + `try{var sp=s.getItem(c.keys.palette),sm=s.getItem(c.keys.mode);if(c.allowed.palette.indexOf(sp)>-1)p=sp;if(c.allowed.mode.indexOf(sm)>-1)m=sm;}catch(e){}`
    + `r.setAttribute("data-palette",p);r.setAttribute("data-mode",m);r.setAttribute("data-theme",c.daisy[m]);r.classList.add("tag-js");`
    + `}catch(e){}})();`
    + `(function(){try{var u=Number(localStorage.getItem(${JSON.stringify(DEV_BANNER_DISMISS_KEY)})||"0");if(u>Date.now())document.documentElement.classList.add(${JSON.stringify(NOTICE_HIDDEN_CLASS)});}catch(e){}})();`;

  return (
    <Html
      lang="en"
      className="font-sans"
      data-theme={config.colors.theme}
      data-palette={DEFAULT_PREFS.palette}
      data-mode={DEFAULT_PREFS.mode}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <Head>
        {/* Must stay first, so the saved palette applies with no flash */}
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Bebas+Neue&family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Courgette&family=Dancing+Script:wght@400;600;700&family=Great+Vibes&family=Oswald:wght@400;500;600&family=Pacifico&family=Parisienne&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Raleway:wght@400;500;600&family=Sacramento&family=Satisfy&display=swap"
        />
        <meta name="theme-color" content={config.colors.main} />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon.svg"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href="/favicon-96x96.png"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="site-body">
        <Main />
        <NextScript />
        {ghlTrackingId ? (
          <script
            src="https://link.msgsndr.com/js/external-tracking.js"
            data-tracking-id={ghlTrackingId}
          ></script>
        ) : null}
      </body>
    </Html>
  );
}
