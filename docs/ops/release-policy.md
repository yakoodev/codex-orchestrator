# Release Policy

## Versioning
- SemVer: `MAJOR.MINOR.PATCH`

## Tagging
- Release tags: `vX.Y.Z`
- Pre-release tags: `vX.Y.Z-rc.N`

## Changelog
- Every release must include a `CHANGELOG.md` entry.
- Contract-impacting changes must explicitly list affected endpoints/events/models.

## Publishing
- Build multi-arch images (`amd64`, `arm64`).
- Publish to GHCR under release tag and `latest` policy as configured.
