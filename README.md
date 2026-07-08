# VersePeek

Highlight a Bible reference anywhere on your desktop and instantly peek at the full passage from Bible Gateway.

## Features

- Global hotkey lookup (default: **Ctrl+Shift+B**)
- Works from any application — highlight text like `John 3:16`, press the hotkey
- Default translation: **NLT** (configurable)
- Switch translations in the popup without re-selecting text
- Runs quietly in the system tray

## Requirements

- Node.js 18+
- Linux (X11 recommended) or Windows
- Internet connection for Bible Gateway lookups

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist:linux   # AppImage + .deb
npm run dist:win     # Windows installer
```

## Usage

1. Start VersePeek — it appears in the system tray.
2. Highlight a Bible reference in any app.
3. Press **Ctrl+Shift+B** (or your configured hotkey).
4. Read the passage; change translation from the dropdown if desired.
5. Press **Esc** or click away to dismiss the popup.

Open **Settings** from the tray menu to change default translation, hotkey, or startup behavior.

## Linux notes

- On X11, VersePeek reads the PRIMARY selection buffer when text is highlighted.
- On Wayland, selection capture may be limited; the app falls back to simulating Ctrl+C.
- For global hotkeys on Linux, some desktop environments require the app to run with appropriate permissions.

## Attribution

Scripture text is loaded from [Bible Gateway](https://www.biblegateway.com/) and remains subject to publisher copyrights. VersePeek displays attribution and links back to the source passage.

## License

MIT
