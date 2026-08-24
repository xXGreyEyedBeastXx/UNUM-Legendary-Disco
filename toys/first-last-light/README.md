# First Light / Last Light

An interactive, deterministic light-and-sound toy for the beginning and end of
the world.

## Run

From the repository root:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080/toys/first-last-light/`.

## Play

- Move or tap inside the field to bend its focal point.
- Send a pulse to perturb the current cycle.
- Change tempo and mirror count while it runs.
- Pause motion at any time.
- Sound is off until explicitly enabled and can be disabled immediately.
- Press `Space` to pause or resume and `R` to return to the beginning.

Reduced-motion preferences start the toy paused. The first frame remains a
complete static composition.

## Honest scope

This is generative browser art, not a physical simulation or a public copy of a
private runtime. Its cycle is a playful projection:

```text
before the first beat
-> first light
-> the world dances
-> last light
-> after the last beat
-> return
```

The field uses a deterministic seed, 360 generated light points, mirrored
beams, user-created pulses, and an optional low-volume Web Audio chord. It uses
no dependencies, network requests, tracking, storage, or private data.
