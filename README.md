![Better Trading logo](public/assets/images/logo.png)

# Better Trading

A browser extension that enhances the pathofexile.com trade site experience for Path of Exile and Path of Exile 2.

This fork maintains existing Better Trading features, with support for both Firefox and Chromium builds, rebuilt from the ground up.

## Features

- Bookmarks manager with folders, icons, drag ordering, and archiving
- Folder sharing through import/export, plus file backups and restore
- Equivalent pricing calculator powered by [poe.ninja](https://poe.ninja/)
- Pinned items with quick navigation to the original result
- Search history and descriptive browser-tab titles
- Merging Live Queries to a single tab
- Wiki and PoEDB links in searched items
- Filtering shortcuts
- Autofill tilde in stat and search inputs

## Contributing

1. Install a current Node.js LTS release and npm.
2. Install dependencies with `npm install`.
3. Run `npm run dev` for Chrome or `npm run dev:firefox` for Firefox.

Development launches use separate persistent browser profiles in `.dev-profiles/`,
so logins and test data survive restarts.

Run `npm run typecheck` and `npm test` to check changes. Tests mirror `src/` under `test/`, with fixtures beside the integration tests.

## Building and packaging

| Browser | Build                   | Package               |
| ------- | ----------------------- | --------------------- |
| Chrome  | `npm run build`         | `npm run zip`         |
| Firefox | `npm run build:firefox` | `npm run zip:firefox` |

Builds and extension archives are generated in `.output/`.

## Release notes

The version in `package.json` determines the extension version and the release
notes loaded from `changelogs/<version>.md`. When releasing, update the version
and add the corresponding Markdown file with a title and Added, Changed, or
Fixed sections.

Run `npm run check:changelog` to validate. Build and package commands run this
check automatically. Only the current release notes are bundled with the
extension and shown in the update dialog and information panel.

## Publishing a release

Create and push a matching annotated version tag after merging the release
commit, for example `git tag -a v0.1.0 -m "v0.1.0"` then `git push origin
v0.1.0`. The release workflow validates that the tag equals `v` plus the
`package.json` version, validates the corresponding changelog, packages Chrome
and Firefox archives, and publishes a GitHub release.

Git hooks are installed automatically by `npm install`. A pre-commit check
validates staged `package.json` version changes; a pre-push check validates
version tags. The workflow repeats both checks, so release validation cannot be
bypassed by skipping local hooks.

## Credits

This form is maintained by [Vali-98](https://github.com/Vali-98).
Better Trading was originally created by [InfaMc](https://github.com/pboutin)
and previously maintained by [brosmike](https://github.com/dbjorge).

[Original repository](https://github.com/poe-world/better-trading) ·
[Support development on Ko-fi](https://ko-fi.com/W7W7X8T7W)

This extension is fan-made and is not affiliated with Grinding Gear Games.
