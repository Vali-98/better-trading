# Folder class icon audit

Checked on October 24, 2026.

Added the following missing character icons to the folder picker:

- PoE1: Reliquarian, Luminary.
- PoE2: Oracle, Shaman.

PoE1 class names were verified against the [official ascendancy page](https://www.pathofexile.com/ascendancy/classes). Small icon asset paths were taken from the [PoE1 class listing](https://poedb.tw/us/Ascendancy_class) and [PoE2 class listing](https://poe2db.tw/us/Ascendancy_class). The four new assets were decoded from WebP and saved as genuine PNG files. The former Raider artwork is named Warden; previously saved `raider` identifiers resolve to `warden.png`.

Assets are organized under `public/assets/images/bookmark-folder/`:

- `poe1/characters/`
- `poe1/items/`
- `poe2/characters/`
- `poe2/items/`

The picker discovers PNGs in these folders. Saved identifiers remain unchanged (for example `reliquarian` and `poe2-oracle`) even though filenames no longer need a game prefix. Classification follows the directory, so item icons cannot appear among character icons.
