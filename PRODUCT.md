# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite, CSS3 (no UI framework), Lucide React icons, LocalStorage for persistence. Installable PWA. Deployed later to GitHub Pages through GitHub Actions (the user publishes it).

## Users

**Assumed (the interview went unanswered; recommended option applied):** an adult patient hospitalized in an ICU (the reference says "Estás en la UCI de la Clínica de Occidente", Cali), using the screen from bed, often tired, medicated, disoriented about the time or anxious. Their family and the clinical staff prepare the content: messages, photos, treatment and procedures.

## Product Purpose

NEXO is a dedicated bedside device for wellbeing, orientation and family connection. The hardware is an 11" iPad Air in landscape. The app is the device's software, not a website about it. Success means the patient knows where they are, what day and time it is, and who is with them; hears their family; can calm down; understands their care; and can ask for help with a single touch.

## Positioning

"Orientación que conecta, tecnología que acompaña." An ICU companion that puts orientation, family and calm on one screen built for someone lying in bed. It is not a clinical record and not a general-purpose tablet.

## Operating Context

- Bedside table or bed arm; touch only; viewed from 40–70 cm, often lying down, in dim light.
- Family members and nurses edit content from a PIN-protected panel on the same device.
- No paid services or external APIs for core features. Audio (ambient sounds, music) is synthesized on the device; voice messages are read aloud with the browser's speech synthesis.

## Capabilities and Constraints

- Sections: Inicio, Mi guía (orientation; assumed, since it appears in the reference nav but not in the brief), Mi gente, Mi mundo, Mi cuidado, plus Ajustes.
- Persistent controls mirror the reference hardware: volume −, play/pause, volume +, and a call bell.
- The call bell and the video call are **simulated** in this version: there is no integration with a nurse-call system or a video service. This must never be presented as real.
- Weather is static, editable content (no API).
- Primary orientation is landscape, with a usable portrait fallback. Orientation cannot be forced in Safari.

## Brand Commitments

- Name: NEXO. Tagline: "Orientación que conecta, tecnología que acompaña."
- The attached reference image (four screens: Inicio, Mi gente, Mi mundo, Mi cuidado) is the binding visual reference: deep blue / blue-violet / lavender, soft gradients, organic waves, rounded cards, violet glow, minimal line icons, large buttons.
- Spanish (Colombia) voice: warm, second person ("tú"), short sentences.

## Evidence on Hand

- `src/familia.jpg`: family photo cropped from the user's reference image (low resolution; the family can replace it from the panel).
- All names, medications, procedures and messages are **demonstration data** and are labeled as such in Ajustes. No real patient data.

## Product Principles

1. Orientation first: the day, time and place are always one glance away.
2. One touch to help: the call bell is reachable from every screen.
3. Calm over stimulation: slow motion, no alerts competing with care.
4. Family voice is the heart: messages and photos lead, not features.
5. Honest demo: anything simulated says so.

## Accessibility & Inclusion

Users may have low vision, tremor, fatigue or reduced cognition. Large touch targets (at least 56px; primary ones larger), icons always paired with labels, adjustable text size, high contrast on the dark ground, respect for reduced motion, and no reliance on hover.
