# Start here - v6.1

## Native TypeSafe

Create `.env` from `.env.example` only if it does not already exist. Add `TYPESAFE_API_KEY=your_personal_typesafe_key`, keep the file private, and restart the server. Or enter the personal key in the connection dialog; in server mode it is held in server memory until disconnect/shutdown, not only in the browser. No OpenRouter key is required for native Jev.

Launch `START-WINDOWS.cmd` after extraction, or `sh START-MAC-LINUX.sh`. Node.js 22+ is required. The browser opens the local server on port 4317. If it does not open, visit `http://127.0.0.1:4317` manually. Change PORT in `.env` when an unrelated application already owns that port.

Do not run two ORIGIN processes against one data directory. Close the old release's server before starting this one. The default is loopback-only; it is not a hardened multi-user internet service.

In **Connect TypeSafe** keep native TypeSafe, `jev-latest`, bridge and Jev only. The account-access button checks the model endpoint; it does not advance the world. Account access is not proof that a subsequent decision request will succeed. Read the error details if access fails.

Choose an explicit total request cap and a simulated-time window. Caps count attempts, not dollars; configure a provider-side spending limit as well. Click Connect and run, then Run lives for sustained operation. Nothing acts before this approval.

## Resume the supplied v6 civilization

Before connecting, select **Help -> Restore supplied v6 / 332 completions**. This restores the complete source save in pause, including the 961 historical attempts, six people, three learned individual abilities and four unfinished activities. No new budget or inference is authorized by restoration.

Open **Life audit** and inspect the people. Configure your TypeSafe key and explicitly set a total request cap above 961; for example 1200 leaves 239 new attempts. The configured server ceiling still applies. The test-access button itself does not execute an activity. The connection form's **Connect and run** button can begin the authorized run, so inspect your limits before submitting.

Three new, measured low-benefit completions in the recent review window trigger a progress hold. **Review** keeps the evidence, clears the spending guard and asks Jev to reconsider on the next authorized run. It is not a command to eat, explore, learn or create an object. Do not repeatedly clear a hold without inspecting its reason.

The old v4 turn-74 save remains in `recovery/turn-74.snapshot.json` for manual import; the recovery button now targets the supplied v6 civilization.

## First meaningful scene

For immediate household gameplay, choose **Help -> Homestead** before authorizing model use. For visible advanced infrastructure, use **Modern**. These are labeled starting scenarios, never presented as emergent history. To start the longer learning experiment, choose **First Minds**.

Select a person, inspect their activity/needs/relations, and follow them. Open Families for genealogy, Build for paid construction plans, and Economy for stores and work. A plan from the player is a suggestion/physical job opportunity; it is not a forced choice or a free building.

The graphics initially use the bundled isometric renderer. Drag to pan, use the wheel to zoom and shift-drag to rotate. A person can be selected directly in the scene. Optional Three.js mode uses the same world state and requires the library. The game remains inspectable if the library download is blocked.

## Terrain and Earth

The Earth outline is real public-domain land geometry. Pick a latitude/longitude before starting activities. Generated local relief, climate and material distribution are explicitly estimates. Use **Load real elevation (online)** to fetch a bounded public Terrarium height tile from the fixed source; the resulting metadata identifies it. A validated JSON height grid can also be imported.

Changing geography requires a paused world with no unfinished activities/reservations. This prevents moving an in-progress action into incompatible terrain. Use a fresh declared scenario when experimenting with new geography. This feature selects one active region; it does not run the entire planet or reconstruct prehistoric Earth.

## Server runs and recovery

The checkbox for detached operation explicitly permits the Node process to continue without a browser until the approved bounds. Without it, 30 seconds without a viewer pauses the run. Keeping an unattended run approved can incur costs: both Jev and planner have separate allowances. A second browser attaches to the same world, rather than creating duplicate lives.

Use Pause before major configuration changes. Authorized, unfinished activities are retained; disconnect does not silently complete them. The server checkpoints to `data/world-v6.json`. Restart always recovers paused, even if the prior run allowed detached operation. Reconnect, review remaining caps, and authorize the next window.

Save/export includes the complete current world and journal, not the credentials. Importing either included recovery does not invent missed skills or erase its historical paid requests. An older save is migrated to current state; it is local historical evidence, not a provider-signed attestation.

## Troubleshooting

- Budget reached: review the total used and approve a higher finite total through Request budget. No automatic escalation.
- Repeated infeasible plans: read the path/material conflict in Chronicle or the ledger. Do not equate a valid model response with a feasible physical action.
- Model error: the world pauses visibly. There is no local decision fallback. Provider errors and failed attempts remain in the journal.
- Bad save: keep the original checkpoint for diagnosis; do not overwrite it with a new scenario before exporting what remains.
- Browser closed: only an explicitly approved, still-running Node process can continue. Computer sleep and process termination stop it.
