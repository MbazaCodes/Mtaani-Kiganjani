# Tanzania Location Reference Data

## Production policy

E-Mtaa must not treat manually invented or sample administrative locations as authoritative production data.

The legacy `E-MTAA_SEED_DATA.sql` location block was removed from production seeding because it was explicitly labelled “Sample Districts” and mixed administrative levels. Existing service/reference seed data is retained.

## Authoritative source

Use the **National Bureau of Statistics (NBS), Tanzania — 2022 Population and Housing Census administrative shapefiles** as the baseline source for production location imports.

- Dataset: Tanzania Region Shapefile Metadata, 2022 Population and Housing Census
- Dataset ID: `TZA-NBS-PHC-2020-ShapeFilesv01`
- Version: `v0.1`
- Version date: `2022-05-30`
- Administrative levels described by NBS include Region, District/Council, Division and Ward.
- NBS also publishes 2022 PHC ward shapefiles and lower-level Village/Mtaa / enumeration-area framework resources.

## Import rules

1. Preserve the official hierarchy: Region → District/Council → Ward → Village/Mtaa where the source provides it.
2. Never promote a ward, town, municipality, or locality to “region” or “district” merely to fill a dropdown.
3. Store source metadata with every imported dataset version.
4. Validate codes/names and parent-child relationships before replacing production reference data.
5. Keep demo/sample locations in an explicitly demo-only fixture, never in the production seed.
6. Do not infer missing locations.

## Current application dataset

`src/lib/addressData.ts` is a legacy application-side reference snapshot. It is useful for UI continuity but has **not been certified in this cleanup as a complete authoritative national hierarchy**. It must not be represented as authoritative until it is regenerated from the NBS source above and validated.

A future import should generate the application lookup file and database `locations` rows from the same versioned source to prevent drift.
