# Specter

<p align="center">
  <img src="./screenshots/home.png" width="22%" alt="Home">
  <img src="./screenshots/setup.png" width="22%" alt="Setup">
  <img src="./screenshots/maintain.png" width="22%" alt="Maintain">
  <img src="./screenshots/settings.png" width="22%" alt="Settings">
</p>

[![latest release](https://img.shields.io/github/v/release/dpejoh/specter?label=Release&logo=github)](https://github.com/dpejoh/specter/releases/latest)

Keybox management, security spoofing, and detection avoidance — all in one module.

[Download](https://github.com/dpejoh/specter/releases/latest)

## Background

Specter is a fork of Yurikey, rewritten for clean architecture, proper error handling, and multi-source keybox support. 100% free, no paywalls, no business agenda — just a module that works.

If Specter helps you out, consider buying me a coffee:
[ko-fi.com/dpejoh](https://ko-fi.com/dpejoh)

## Quick start

1. Install [Play Integrity Fix](https://github.com/KOWX712/PlayIntegrityFix/releases/latest) or [Play Integrity Fork](https://github.com/osm0sis/PlayIntegrityFork/releases/latest)
2. Install [Tricky Store](https://github.com/5ec1cff/TrickyStore/releases/latest)
3. Install Specter via Magisk / KernelSU / APatch
4. Open WebUI → Setup tab → Install a keybox

## Features

- **Keybox** — multi-source catalog, custom keybox (file/URL/path), Google revocation checking, private keybox support, backup and restore
- **Spoof** — target.txt, security patch, verified boot hash, blacklist, smartmerge, TEESimulator support
- **Maintain** — GMS kill, PIF fix, HMA-OSS / Zygisk Next / RKA configs, detection cleanup, Widevine L1
- **Settings** — theme (dark/light/auto + 9 color presets + Monet), language, dev mode with terminal, project contributors

## Requirements

- Root access (Magisk / KernelSU / APatch)
- Tricky Store
- Play Integrity Fix or Play Integrity Fork (recommended)

## Build from source

```bash
git clone https://github.com/dpejoh/specter
cd specter
npm install
npm run build
```

Output: `module.zip`

## License

GNU GPL v3.0
