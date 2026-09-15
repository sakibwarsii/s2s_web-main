"use client";

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    CWASA: any;
    CWAClientCfg: any;
    // Set once CWASA's own "avatarloaded" hook fires (the character mesh
    // actually finished loading) â€” see registerAvatarReadyHook below and
    // the readiness gate in useCWASA.ts's playNextInQueue for why
    // "window.CWASA exists" isn't a safe enough signal to play on.
    __cwasaAvatarReady?: boolean;
  }
}

// BUG FIX, ROUND 2 (unrelated to the framing rewrite below): "avatar
// doesn't appear" / "not signing" â€” and, found later the same night, an
// avatar-SWITCH crash too. Both are the same root cause; round 1 fixed the
// wrong milestone.
//
// ROUND 1 (insufficient â€” kept here as history, replaced below): gated on
// CWASA.init()'s returned/`.ready` Promise. That only proves avPanels[0]
// was CONSTRUCTED and startAvatar() was CALLED â€” not that the character
// model actually finished loading, which happens later via an internal
// async chain (SigningAvatar.startBinaryAvatar/startJSONAvatar). Calling
// playSiGMLText in THAT remaining gap doesn't silently no-op like the
// avPanels case did â€” it throws for real, because playSiGMLText's very
// first line is `this.character.getName()` and `this.character` is still
// null: "Cannot read properties of null (reading 'getName')". Confirmed by
// an actual crash log, not a guess this time.
//
// ROUND 2 (this fix): CWASA itself calls a hook named "avatarloaded" â€”
// see SigningAvatar.startNewCharacter() in cwasa.js â€” at the exact moment
// this.character is finally set (fires with the avatar name on success,
// null on a genuine load failure). That's the real milestone, and it's
// exposed publicly via window.CWASA.addHook, same mechanism CWASA's own
// GUI code uses internally. This also covers avatar SWITCHING, not just
// the first load: the same hook fires again on every switch, and the
// avatar-switch effect below now waits for it too instead of firing the
// instant `isInitialized` was true â€” which is what caused a second real
// crash tonight (AGI.SetAvatar reading avXMLs[1] of undefined â€” its avatar
// config data isn't loaded yet either, in that same gap).
function registerAvatarReadyHook() {
  if (typeof window === 'undefined' || !window.CWASA?.addHook) {
    // CWASA's script hasn't finished loading yet â€” nothing to hook into.
    // The polling-interval branch below calls this again once it has.
    return;
  }
  window.CWASA.addHook('avatarloaded', (evt: { msg?: string | null }) => {
    window.__cwasaAvatarReady = true;
    if (!evt?.msg) {
      // CWASA already logs its own warning/stack for the underlying load
      // failure (see startJSONAvatar/loadBinaryAvatar's catch blocks) â€”
      // this just makes it clear here why playback may still misbehave
      // even though the flag is now (deliberately) unblocked rather than
      // left hanging forever on a load that isn't coming.
      console.warn('[CWASA] Avatar failed to load â€” marking ready anyway so playback does not hang forever, but signing/switching may still fail. See the CWASA warning above for the actual cause.');
    }
  });
}

interface SignAvatarProps {
  avatarName: string;
  isScreenshare?: boolean;
  isVisualAssist?: boolean;
  /** Current height (px) of the draggable PiP box, when a PiP box is
   *  actually positioning the avatar (screenshare or Visual Assist on). */
  pipBoxHeight?: number;
  /** User-controlled zoom multiplier (1-4x) from Settings > Character â€”
   *  only applies while a PiP box is active; see DEFAULT_SCALE below for
   *  the fixed-corner case. */
  characterScale?: number;
}

// ROOT CAUSE (found by tracing what CWASA actually measures): the real
// culprit was never the .canvasAv CSS overrides below â€” it was the
// .CWASAPanel MOUNT DIV further down, which was styled `width:100%;
// height:100%`. That div is CWASA's own container; it's what the library
// reads (via clientWidth/clientHeight or a ResizeObserver on it) to decide
// the avatar's camera fit and internal canvas buffer resolution. Because
// page.tsx's Rnd box genuinely changes its real layout size (both drag-resize
// and the characterScale setting resize the actual box, not just its CSS
// transform), that mount div was ALSO genuinely resizing every time â€” so
// CWASA kept re-fitting its camera to "show the whole avatar" in the new
// size, and rebuilding its render buffer at mismatched resolution (the blur).
// Overriding .canvasAv's own CSS was fighting the SYMPTOM, not the cause.
//
// Fix: pin the .CWASAPanel mount div itself to a constant, never-resized
// pixel size â€” CWASA now always measures the exact same container, so its
// camera fit and buffer resolution never change, ever. All zoom (from both
// drag-resize and the Character Size setting) is then a pure CSS
// transform: scale() applied to that same pinned-size div, which is purely
// visual and never touches anything CWASA measures.
// IMPORTANT (learned from the last two rounds): canvasAv always fills 100% of
// this pinned mount div â€” there is no CSS-level cropping happening. What CWASA
// actually shows (how much of the body fits in frame) is driven by fitting
// the whole avatar to THIS DIV'S ASPECT RATIO. A wider/shorter box (420x380,
// tried last round) fixed arm-clipping but squeezed the vertical range enough
// that hands fell out of frame. Going back closer to the original aspect
// (300x380, confirmed correct in the very first screenshot of this whole
// thread â€” head-to-waist, no complaints about arms OR hands) restores the
// vertical room for hands; nudged slightly wider than that original to keep
// some of the shoulder room the 420 version bought.
// Taller than the last attempt â€” her hands were still juuust clipped at the
// bottom edge (fingertips right at the line). More height gives CWASA's
// whole-avatar-fit more vertical room to include them fully.
// Widened + heightened again: the static pose's hands were still tight
// against the bottom edge, and since sign language actively moves the hands/
// forearms outward and up-down (this is a STATIC crop, it can't track the
// motion), a snug fit around the resting pose means active signing will
// clip. Giving genuine margin around the resting hands, not just a bigger
// render of the same tight crop, is what actually protects against that.
//
// UNIFIED (this rewrite): this box's aspect ratio is what produces the
// correct head-to-waist crop above â€” but it was only ever being used while
// Visual Assist or screenshare was on. Whenever NEITHER was on (which is
// the default state of every fresh session, and also what "Focus mode"
// resolves to), a completely separate, never-actually-tuned code path took
// over instead: a dead-centered box scaled to 100vh â€” full body, not
// head-to-waist, and with no side-anchored positioning. That's the "she's
// tiny and lost in a giant black void" look. There is no reason to have two
// different presentations â€” the SAME crop box below is now used always;
// only how it's ANCHORED on screen differs (centered + draggable via
// page.tsx's Rnd box vs. fixed to a screen corner), never the crop itself.
const PIP_BASE_HEIGHT = 480;
const PIP_BASE_WIDTH = 380;

// Used only when there's no draggable PiP box positioning the avatar (i.e.
// neither screenshare nor Visual Assist is active â€” including "Focus
// mode", which resolves to this same state). Anchors to the bottom-right
// corner of the viewport instead of the old dead-center/full-body
// treatment. Scale is a starting point, not a final pixel-perfect answer â€”
// every other number on this page got there by iterating against an actual
// screenshot, this one hasn't yet.
const DEFAULT_SCALE = 1.4;
const DEFAULT_RIGHT = '3vw';
const DEFAULT_BOTTOM = '4vh';

// RESOLUTION, ROUND 2 (round 1 below was wrong â€” kept as history since the
// underlying canvas.width=clientWidth fact is still true, just not the
// controlling factor here):
//
// ROUND 1 theory: resize the mount div's CSS layout size dynamically per
// render (to visual-size x devicePixelRatio) and scale down from that.
// DISPROVED by a real side-by-side test: enabling "PiP background" made the
// outer frame visibly grow (confirming the div itself WAS resizing) while
// the avatar inside stayed exactly the same size â€” so something else was
// capping it, unrelated to the mount div at all.
//
// ROUND 2, ACTUAL ROOT CAUSE (traced into cwasa.js's HTMLForAvatarGUI):
// CWASA builds its entire GUI as a legacy HTML <table>, and the avatar's
// cell is written as `<td width="${avw}" height="${avh}">`, where avw/avh
// come directly from avSettings.width/height in CWAClientCfg â€” baked into
// the HTML ONCE when init() runs, completely independent of any CSS on the
// mount div. That table cell â€” not the mount div â€” is what was actually
// bounding the avatar's real size, fixed at the old 768x640 default no
// matter how big the outer div/frame grew.
//
// FIX: avSettings.width/height (below, in both init() calls) now match
// BASE_RENDER_WIDTH/HEIGHT exactly, and the mount div is pinned to that
// same fixed size too (not resized dynamically â€” round 1's approach can't
// work here since avSettings is baked in once at init and never revisited).
// ALL zoom â€” Character Size, drag-resize, the fixed-corner default â€” is a
// pure CSS transform: scale() on top of this one shared fixed base, same
// pattern the original 380x480 version used, just at real resolution
// instead of blurry. Aspect ratio (PIP_BASE_WIDTH:PIP_BASE_HEIGHT) is
// preserved exactly, so the crop tuned above is unaffected â€” only
// sharpness and how much scaling up/down happens.
// 2.5x -> 5x, matching page.tsx's characterScale default bump â€” keeps the
// native render matching the new default size instead of upscaling (blur)
// from a buffer sized for the smaller, previous default.
// Reverted from *5 (1900x2400): that size was never actually confirmed to
// work â€” bumped alongside characterScale's 2.5->5 jump without separately
// testing it, and the very next real-browser test showed the avatar
// silently vanish (no error, no CWASA log lines at all â€” consistent with
// the WebGL/table-cell request itself failing quietly at that size, not a
// crash). *2.5 (950x1200) is the one actually confirmed working in a real
// screenshot. characterScale=5 still makes the outer viewport bigger;
// displayScale now upscales a bit more from this proven-good buffer
// instead of requesting an unproven, much larger one.
const BASE_RENDER_WIDTH = PIP_BASE_WIDTH * 2.5;   // 950
const BASE_RENDER_HEIGHT = PIP_BASE_HEIGHT * 2.5; // 1200 â€” native, unscaled resolution; proven working at this size

export default function SignAvatar({ avatarName, isScreenshare, isVisualAssist, pipBoxHeight, characterScale }: SignAvatarProps) {
  const isInitialized = useRef(false);
  const isPip = isScreenshare || isVisualAssist;

  // HEAD-TO-WAIST CROP: CWASA fits the WHOLE avatar (head to feet) into
  // whatever aspect ratio the mount div has â€” every earlier round of
  // tuning (see the crop-history comment above) only ever adjusted THAT
  // aspect ratio, so head-to-toe was always what got shown, just framed
  // differently. To actually crop the legs out, the avatar needs to be
  // rendered BIGGER than the visible box and let the box's overflow:hidden
  // clip the excess â€” CROP_ZOOM is that "bigger than fit" factor, and
  // anchorY shifts the crop window up so the excess gets taken from the
  // BOTTOM (legs) rather than split between both ends. Both are first-pass
  // estimates, not verified against a live screenshot the way every other
  // number on this page was â€” expect this to need one round of up/down
  // adjustment once actually seen.
  // 1.5 -> 1.3: confirmed live that hands were getting cut near the bottom
  // edge with generous spare room above the head â€” a straight zoom-out
  // shows more on both ends, using that spare headroom rather than adding
  // more of it. (The exact transform math for anchorY above predicted a
  // different visible range than the actual screenshot showed, so treat
  // that math as directionally right but not exactly trustworthy â€” this
  // number is a proportional adjustment from what was actually seen, not
  // another from-scratch calculation.)
  // REVERTED 1.3 -> 1.5: confirmed live that reducing this shrank her
  // overall â€” not what was wanted. The hands-cut-off problem needs solving
  // by repositioning the SAME size crop (anchorY below), not by zooming
  // out to fit more in.
  const CROP_ZOOM = 1.0;
  // -78 -> -24: confirmed live (real screenshot) that -78 cropped the head
  // entirely â€” worked out why by hand from the actual transform math
  // (translate(-50%,-78%) scale(1.5) around center-origin on a 950x1200 box
  // in a 1200x1200 frame put the top of her head ~636px above the visible
  // frame, over half its height). -24 is the value that calculation puts
  // her head at, not a re-guess â€” but it's still solving for an assumption
  // (that CWASA fills the canvas exactly head-to-feet edge-to-edge) I can't
  // directly verify without seeing the actual render, so treat this as a
  // real step closer, not guaranteed exact â€” nudge further if the head is
  // still clipped, or if too much headroom/not enough waist shows now.
  // -24 -> -36: at -24 (full size, CROP_ZOOM 1.5) the head was fully in
  // frame with generous spare room above it, but the hands were still
  // clipped at the bottom â€” confirmed live, twice. Same size, shifted
  // further down so that spare headroom gets spent revealing more of the
  // bottom (hands) instead of sitting empty above her head.
  const anchorY = -50; // only used by the isPip branch below â€” the fixed-corner
  // branch anchors via transformOrigin instead and doesn't use this at all.

  // The actual on-screen height we need to fill, in either mode â€” for isPip
  // this already has drag-resize AND the characterScale setting baked in
  // (see page.tsx); for the fixed-corner default it's just the base times
  // DEFAULT_SCALE. displayScale is the ONE CSS transform value that gets
  // us there from the fixed BASE_RENDER_HEIGHT native render, then
  // CROP_ZOOM zooms in further for the head-to-waist crop above.
  const rawVisualHeight = isPip
    ? (pipBoxHeight || PIP_BASE_HEIGHT)
    : PIP_BASE_HEIGHT * DEFAULT_SCALE;
  // Ensure avatar fits within viewport height so hands are never cut off below the screen
  const targetVisualHeight = typeof window !== 'undefined'
    ? Math.min(rawVisualHeight, Math.max(360, window.innerHeight * 0.84))
    : rawVisualHeight;
  const displayScale = (targetVisualHeight / BASE_RENDER_HEIGHT) * CROP_ZOOM;

  // REVERTED: an earlier speculative "warm-up" call used to fire here â€”
  // window.CWASA.playSiGMLText("<sigml></sigml>") a moment after init, on the
  // unverified theory that it might pre-pay some first-call engine cost.
  // Pulled it after a real sign-language failure report ("said a sentence,
  // subtitles were correct, but the avatar never signed"): if a user starts
  // recording and speaks almost immediately, that empty warm-up call could
  // land in the middle of â€” or right before â€” the FIRST real playSiGMLText
  // call, and an empty <sigml></sigml> (zero <hns_sign> tags) is exactly the
  // kind of input CWASA was never actually confirmed to tolerate gracefully.
  // Not proven as the cause, but it's the most recent, most plausible one,
  // and the unconfirmed "maybe shaves some cold-start time" benefit isn't
  // worth risking actual sign playback silently breaking. If first-line
  // delay is still a real problem, it needs a verified fix, not this guess.

  const isIndianAvatar = avatarName === "luna";
  const underlyingAvatar = (avatarName === "francoise" || avatarName === "prachi" || avatarName === "soumya") ? "luna" : avatarName;

  useEffect(() => {
    if (!isInitialized.current) {
      if (typeof window !== "undefined" && window.CWASA) {
        // Registered BEFORE init() (not after) so there's no window where a
        // fast load could fire the hook before anything's listening for it.
        registerAvatarReadyHook();
        window.CWAClientCfg = {
          "jasBase": "https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021/",
          "cwaBase": "https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021/cwa/",
          "avsbsl": ["luna", "anna", "siggi", "marc"],
          "avSettings": [
            {
              "avList": "avsbsl",
              "initAv": underlyingAvatar,
              "width": BASE_RENDER_WIDTH,
              "height": BASE_RENDER_HEIGHT,
              "initCamera": [0, 0.0, 4.3, 0, 0, 30, -1, -1]
            }
          ],
          "av0.bkgnd": "transparent"
        };
        window.CWASA.init(window.CWAClientCfg);
        isInitialized.current = true;
      } else {
        const interval = setInterval(() => {
          if (window.CWASA) {
            registerAvatarReadyHook();
            window.CWAClientCfg = {
              "jasBase": "https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021/",
              "cwaBase": "https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021/cwa/",
              "avsbsl": ["luna", "anna", "siggi", "marc"],
              "avSettings": [
                {
                  "avList": "avsbsl",
                  "initAv": underlyingAvatar,
                  "width": BASE_RENDER_WIDTH,
                  "height": BASE_RENDER_HEIGHT,
                  "initCamera": [0, 0.0, 4.3, 0, 0, 30, -1, -1]
                }
              ],
              "av0.bkgnd": "transparent"
            };
            window.CWASA.init(window.CWAClientCfg);
            isInitialized.current = true;
            clearInterval(interval);
          }
        }, 500);
      }
    }
  }, [underlyingAvatar]);

  // Handle avatar switching natively through CWASA API without unmounting.
  useEffect(() => {
    if (window.__cwasaAvatarReady && typeof document !== "undefined") {
      const select = document.querySelector('.menuAv.av0') as HTMLSelectElement;
      if (select && select.value !== underlyingAvatar) {
        window.__cwasaAvatarReady = false;
        select.value = underlyingAvatar;
        select.dispatchEvent(new Event('change'));
      }
    }
  }, [underlyingAvatar]);

  const containerStyle: React.CSSProperties = isPip ? {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: `${BASE_RENDER_WIDTH}px`,
    height: `${BASE_RENDER_HEIGHT}px`,
    transform: `translate(-50%, 0%) scale(${displayScale})`,
    transformOrigin: 'top center',
    overflow: 'hidden',
    background: 'transparent'
  } : {
    position: 'fixed',
    right: DEFAULT_RIGHT,
    bottom: DEFAULT_BOTTOM,
    width: `${BASE_RENDER_WIDTH}px`,
    height: `${BASE_RENDER_HEIGHT}px`,
    transform: `scale(${displayScale})`,
    transformOrigin: 'bottom right',
    overflow: 'hidden',
    background: 'transparent'
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Transparent everywhere CWASA draws — no opaque box behind her */
        .CWASAPanel, .CWASAPanel *, .divAv, .CWASAAvatar, .CWASAPanel canvas {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        .CWASAGUI td:first-child { display: none !important; width: 0 !important; }
        .divCtrlPanel { display: none !important; }
        .CWASAPanel input, .CWASAPanel textarea, .CWASAPanel select {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
            caret-color: transparent !important;
        }

        .canvasAv {
            display: block !important;
            z-index: 1 !important;
            pointer-events: none !important;
            image-rendering: auto !important;
            width: 100% !important;
            height: 100% !important;
            position: static !important;
            transform: none !important;
        }
      `}} />
      <div
        className="sign-avatar-wrapper relative"
        style={containerStyle}
      >
        <div
          className="CWASAPanel av0 absolute inset-0"
          data-av={underlyingAvatar}
          style={{
            width: `${BASE_RENDER_WIDTH}px`,
            height: `${BASE_RENDER_HEIGHT}px`,
            background: 'transparent',
            zIndex: 1
          }}
        />
      </div>
    </>
  );
}

