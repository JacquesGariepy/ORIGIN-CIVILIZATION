# Assets

The production isometric renderer and all procedural artwork are bundled in the HTML. No graphics CDN is required for this mode. No model response is fabricated if the network is unavailable.

`earth-land.geojson` and its embedded copy are actual public-domain Natural Earth land geometry. See NATURAL-EARTH-NOTICE.txt and docs/DATA-SOURCES.md.

Optional 3D uses pinned Three.js 0.160.1. `node install-assets.cjs` fetches that library from approved mirrors, writes `assets/three.min.js` plus provenance/hash metadata, and rebuilds ORIGIN.html with the library embedded. The library could not be fetched in the build environment. Without it, the isometric scene remains functional. THREE-LICENSE.txt retains the license for later redistribution.

Optional elevation tiles are requested only by explicit user action through the server. No real DEM is prepackaged and resource layers are modeled estimates, not surveyed claims.
