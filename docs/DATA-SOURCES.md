# Geography and rendering sources

## What is actually bundled

`assets/earth-land.geojson` contains a dissolved, simplified MultiPolygon derived from the public-domain Natural Earth low-resolution country geometry. The packaged local input had 177 features. Country boundaries were dissolved; only land outlines are drawn in the application. The same JSON is embedded into `source/earth-data.js` so the Earth map has no external dependency. This is a cartographic land outline, not measured local elevation or a mineral survey.

Source and terms: https://www.naturalearthdata.com/about/terms-of-use/

The export operation uses the locally available `naturalearth_lowres` data in pyogrio's test fixtures, dissolves its geometry and simplifies it by 0.07 degrees. The input collection's provenance is Natural Earth. Attribution is retained despite public-domain status. No proprietary EA geographic assets are included.

## Optional measured heights

A user can explicitly request a zoom-12 Terrarium tile at the chosen coordinate. Only this fixed source is used:

`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{x}/{y}.png`

The decoder reconstructs heights in metres as `R * 256 + G + B / 256 - 32768`, bounds input/output sizes and samples a 33-by-33 local grid. The imported record stores source, tile coordinates/bounds, date and horizontal scaling. The tile is represented by one bounded 96-unit local region; this compression is not a claim that a game unit equals a real metre. A validated supplied height grid can replace the downloaded tile.

- Dataset registry: https://registry.opendata.aws/terrain-tiles/
- Tile service explanation: https://www.mapzen.com/blog/terrain-tile-service/
- Underlying source attribution and applicable notices: https://github.com/tilezen/joerd/blob/master/docs/attribution.md

Retain these attributions when distributing downloaded source tiles or derived terrain. Underlying elevation sources vary by location; ORIGIN does not claim that every pixel was measured by one survey or that these data reconstruct an ancient period. Public tile availability is external and may fail. The production download was not exercised in this offline build environment; decoding and integration were tested with synthetic PNG fixtures.

## Generated or modeled layers

Resource-site locations/quantities, climate, vegetation, soil, water availability, plant growth, minerals, pollution and local ecological parameters are generated or modeled game state, not surveyed findings. The map labels and imported record distinguish generated from measured elevation. No promise of all terrestrial resources, actual present weather or prehistoric authenticity is made.

## Renderer and art

The bundled Canvas/isometric renderer and procedural human/object scenery are original project code. Optional Three.js is pinned to 0.160.1 and distributed under MIT when the operator downloads it with `install-assets.cjs`; its license notice is included. The installer records the URL, date and SHA-256 of the fetched library. No font, proprietary Sims character, EA texture, commercial audio or motion-capture asset is included.

Three.js: https://threejs.org/ and https://github.com/mrdoob/three.js
