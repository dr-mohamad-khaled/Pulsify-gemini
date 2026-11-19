# Pulsify — Handoff for a new AI engineer (state as of 2026-11-19, v5.9.2)

Read this whole file before touching code. You are continuing work another AI started.

## 0. How to work with the owner (Dr. Khaled)
- Talk to him in natural, casual **Egyptian colloquial Arabic** (human, not formal). Code, comments and in-app text stay in **English**.
- Give complete instructions and ready-to-paste prompts **all at once**, never piecemeal.
- He wants to **test every change in a browser preview first**, before any APK.
- He is very demanding on quality. He rejects: stiff/robotic motion, "statue" creatures, legs that look like "dangling sticks", walking in place, low resolution, pixelation, faceted shading, things that look cheap or "dumb", and any in-app option that changes nothing visible.
- Free tools only for animation (no paid software/subscriptions). He already pays for Meshy.
- Never push/merge to GitHub or publish without his explicit OK.

## 1. What Pulsify is
An Android **live-wallpaper app** aiming to be the best in the world: interactive creatures ("buddies"), looping video wallpapers, cosmic scenes, cars, jelly blobs, music reactivity, touch-to-play instruments. Target: Google Play, one-time payment. Must be **ultra smooth on all Android devices, low RAM, light on battery**.

Visual identity: AMOLED black `#000000`–`#09070E`, glass cards `#15121E`–`#1E192B` (blur 20px), primary accent lavender `#CDB4FF` (dark text `#0D0A14`), rim/highlight amber `#FFB36B` + violet `#9D4EDD`, text white / `#9E96B0`, status badges `#1A2E2B` bg with `#4ADE80`/`#2DD4BF` text. Font: Inter / Plus Jakarta Sans.

## 2. Where the code lives (IMPORTANT — read carefully)
- This repo = branch `pets-meshy-wip` at **5.8.0** (Kotlin app, `app/`, `tools/`, `ci/`) + folder **`preview/`** = the **5.9.2 browser preview source** (newest code).
- The Kotlin-side 5.9 changes were never committed and are lost except inside the built APK (`Pulsify-5.9.1.apk` on the owner's PC). They must be re-done in Kotlin from the preview/this doc: native-resolution rendering (GlLoop scale 1, adaptive floor 0.7), PET3 loader + merged/subdivided meshes, normal maps in pet.frag, soft-body uBend/uSquash, 20% creature size, new Cosmo poses/background, hidden useless pickers, worlds 60-77, dual-quaternion skinning, OrbitScene.
- `preview/` holds code only (app.js, index.html, shaders/*.txt, small json). Its heavy assets (pets/*.bin.txt models, textures, worlds/*.webp) are not in git; they are in the published preview https://claude.ai/artifact/4aj5rPzthZCx6y69vYP4zA and the owner's PC. Do not assume they exist in the repo.
- Original repo `dr-mohamad-khaled/pulsify` (release branch `v3` = 5.1.0, old) must not be touched.
- Native app: Kotlin + OpenGL ES (classes: GlLoop, Pet3D, Pet3DScene, WorldScene, AstroScene, FishScene, CreatureInfo.kt; shaders pet.vert / pet.frag / overlay.frag).
- Browser preview: a JS/WebGL port of Pet3D/Pet3DScene/WorldScene/AstroScene (models served as base64 `.bin.txt`, shaders as `.txt`, main logic in `app.js`). The preview is ahead of Kotlin in some areas (see §5).
- 3D assets pipeline (Blender 5.3 — 4.x cannot open these .blend files):
  - Meshy originals: `Downloads\Meshy_AI_*` zips (FBX + 2048 base/normal/roughness/metallic) and GLBs.
  - Cats v3: `Documents\Pulsify_Cats\v3\` → `cats_v3.blend`, `rig3.py`, `catanim3.py` (procedural animation engine), `clips3.py` (36 clips), `export_cats3.py`, `export_reaper2.py`.
  - Props library: `Documents\Pulsify3D\props`. Normal maps: `Documents\Pulsify3D\xfer\nm\`.
  - Export scripts write model format **PET3** (= PET2 + u32 flags; bit0 = 32-bit indices, bit1 = dual-quaternion skinning). Pet3D.kt loads PET1–3.

## 3. Rules learned the hard way (do not regress)
- Render at **native resolution** (GlLoop scale 1, adaptive floor 0.7). Earlier upscaling from ~720 px caused the "pixelated" complaints.
- Meshy meshes arrive split per face → always merge (remove doubles) + Catmull-Clark subdiv level 1 → smooth shading.
- Always use Meshy normal maps (`pets/<name>_n.jpg`, derivative-based tangent frame, OpenGL convention, no green flip). Use highp varyings.
- Creatures are **20% of screen height**, high poly, high-res textures.
- Creatures always **look at the user**, **dance only when music plays**, and **actually travel** when walking (planted feet, no foot sliding).
- Every creature: many hand-made animations (not only Meshy's), at least **3 tricks per minute**, reacts to touch and swipes, can jump onto home-screen widgets, has charging animations (cat drinks milk through a straw with a glowing charging icon; dog eats a bone; Bolt the robot shows a battery screen briefly then re-shows % now and then).
- Meshy has no facial animation → faces/eyes are done in code.
- Several models of the same animal share that animal's animations.
- Environments must match the creature (no night sky behind a puppy); floor centred on screen, no shelves; creatures must never look floating.
- Hide any picker (colour/glow/coat) when it changes nothing.

## 4. Cast & status
- Cats (3D, Meshy coats Snow/Cream/Grey): rig v3 = 45 deform bones, IK legs WITHOUT pole targets, heat weights + 4 smooth passes + limit 4, **dual-quaternion skinning**. Engine has gait generator (walk lateral sequence, trot, rotary gallop), planted paws, curling wrists, spring follow-through for tail/ears/head. "Dangle" = scruff reflex (front paws tucked, hind legs drawn up, tail curled). Owner previously called earlier versions dough-like/warping — waiting for his verdict on v3.
- 2D cat "Mimi" (white, green eyes, multi-colour coats): first vector design rejected (legs/sitting unnatural). Concept art being made in Google Flow; build in code only after he picks a style.
- Reaper (species `reaper2`, Meshy FBX, 14 Mixamo motions incl. 5 dances): home-screen **orbit** scene — 5 launcher pages, 45° camera orbit per page swipe; eyes snap to camera immediately, head follows by spring, body turns to face camera ~1 s after the swipe settles (with steps). Background is a procedural shader (currently moonlit graveyard).
  **Latest owner requests (not done yet):** reaper must keep looking at the user (no looking around); on swipe it gets surprised, searches for the user, finds them, turns to them; reacts to notifications (knocks on the screen and tells the user); ground must be **volcanic**.
- Cosmo (astronaut): zero-g idle set; background = distant stars only (no planets); falls endlessly through space, touches make it fall harder, swipe = next screen. New cheap background (nebula painted once to half-res texture + ~1,950 point-sprite stars, ~25× faster).
- Others: husky (dog, "Kalboob"), parrots (must be realistic, face the viewer), birds (real alternating steps), betta fish "Crimson Sapphire" (30 clips), squirrel (knockdown after repeated touches), Bolt & Nimbus robots, lion, duck, bunny, Mochi, Gloop Gang (jelly blobs, user-picked count, simple code-drawn worlds incl. all-black).
- Worlds: Flow-generated photo worlds ids 60–77 (living room, snow cabin, garden, savanna, waterhole, autumn forest, park, sea terrace, greenhouse, pond, farm, graveyard, pumpkins, robot lab, moon base, planted tank, blackwater tank, balcony), several times of day, "living picture" effects in overlay.frag (plants sway, water ripples, light flicker, cloud drift).

## 5. Next tasks (priority order)
1. Reaper: implement the latest requests in §4 (stare, surprise→search→find→turn, notification knock, volcanic ground) in the preview.
2. Get owner verdict on cats v3 / orbit / new Cosmo background; pick the 2D Mimi style and build it with many interactive animations.
3. Port to Kotlin: dual-quaternion skinning in Pet3D/pet.vert, star point-sprites to AstroScene, OrbitScene.
4. Finish remaining worlds, then APK size: on-demand download of worlds/loops (APK is ~150 MB) before Play Store.
5. Nimbus Bot / Peachy Pudding rigs.
