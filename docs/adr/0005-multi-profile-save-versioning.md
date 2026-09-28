# 5. Save Management: Multi-Profile Versioning with Shared TV Default

Date: 2026-09-27
Status: Accepted

## Context
When multiple users in the household access Retro-Pi Hub from different devices (phones, tablets, PCs), there is a tension between the seamless experience of continuing the active game from the living room TV ("shared cartridge" model) versus the danger of an accidental overwrite of an important campaign save.

## Decision
1. **Default Profile ('tv_shared'):** By default, when a user launches a game without selecting a profile, the active save corresponds to the central TV save (`<rom_name>.srm`), enabling seamless pick-up-and-play.
2. **User Profiles and Slots:** Users can define profiles (e.g. `User1`, `Guest`) or slots. When playing under a user profile, saves are versioned and stored under namespaced paths (e.g. `<rom_name>.<profile_id>.srm`).
3. **Save History & Rollback:** The Hub maintains an automated snapshot history (last N revisions with timestamps) before any incoming overwrite to the `.srm` file. If an accidental overwrite occurs, any previous save revision can be restored via the PWA management interface.
4. **Promotion to TV Slot:** A user save slot can be promoted ("Set as Active TV Save") with explicit confirmation, pushing the user's progress to the TV's default `.srm`.

## Consequences
### Positive
- Offers both friction-free continuation of TV games and safety against accidental overwrites.
- Built-in snapshot history provides disaster recovery for corrupted or mistakenly overwritten saves.

### Negative / Trade-offs
- Requires UI and storage logic on the Hub to track revisions and metadata for each ROM's save files.
