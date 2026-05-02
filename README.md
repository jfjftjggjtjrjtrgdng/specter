# Specter
![Banner](./doc/banner.webp)

[![latest release](https://img.shields.io/github/v/release/khx/specter?label=Release&logo=github)](https://github.com/khx/specter/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/khx/specter/build-test.yml?label=Build&logo=github)](https://github.com/khx/specter/actions)

A systemless module to achieve and maintain device integrity — keybox management, security spoofing, and detection avoidance.

[Download](https://github.com/khx/specter/releases/latest)

---

## How it works

1. Install [Play Integrity Fix](https://github.com/KOWX712/PlayIntegrityFix/releases/latest) or [Play Integrity Fork](https://github.com/osm0sis/PlayIntegrityFork/releases/latest)
2. Install [Tricky Store](https://github.com/5ec1cff/TrickyStore/releases/latest)
3. Install Specter via your root manager (Magisk / KernelSU / APatch)
4. Press the action button or open the WebUI

## Features

- **Keybox management** — download, install, backup, and verify keybox status
- **Target generation** — dynamic target.txt with fixed + installed app entries
- **Security spoofing** — security patch date, verified boot hash, property resets
- **PIF integration** — automatic fingerprint updates for INJECT and Fork variants
- **Zygisk Next** — enforce-denylist, memory-type, and linker configuration
- **Widevine L1** — attestation key installation for Qualcomm devices
- **Detection cleanup** — removes traces from common detector apps
- **RKA** — Remote Key Attestation provisioning for PassIt
- **WebUI** — Material 3 interface for all module controls

## Requirements

- Root access (Magisk / KernelSU / APatch)
- Tricky Store module
- Play Integrity Fix or Play Integrity Fork (recommended)

## Build from source

```bash
git clone https://github.com/khx/specter
cd specter
npm install
npm run build
```

Output: `module.zip`

## License

MIT
