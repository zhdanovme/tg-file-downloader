# Telegram Group File Downloader

A console-based TypeScript CLI tool for downloading files from Telegram groups with authentication, discovery, filtering, and resume capabilities.

## Features

- 🔐 **Authentication**: QR code or phone number authentication
- 🔍 **Discovery**: Scan all joined groups and map available files
- 🎯 **Filtering**: Configure group and file filters (include/exclude patterns)
- ⬇️ **Download**: Sequential file downloads with progress tracking
- 🔄 **Resume**: Interrupt and resume downloads without re-downloading
- 📊 **Status**: Monitor download progress and statistics

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd tg-downloader

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Telegram API credentials
# Get credentials from https://my.telegram.org/apps
```

## Prerequisites

- **Node.js**: Version 20.x or 22.x (LTS)
- **Telegram Account**: Valid account with access to groups
- **Telegram API Credentials**: API ID and Hash from https://my.telegram.org/apps

## Quick Start

**Easiest way**: Just run with no arguments to execute the full workflow automatically:

```bash
npm run dev
```

This will:

1. Check authentication (prompt if needed)
2. Discover all files from your groups
3. Download all files automatically

---

## Usage

### Full Workflow (Autorun)

```bash
# Run complete workflow: auth check → discover → download
npm run dev
# or explicitly
npm run dev -- run
```

The autorun command will:

- Verify you're authenticated (exit if not)
- Scan all groups and discover files (with `--update` to preserve download status)
- Download all pending and failed files (resume enabled by default)

### 1. Authenticate

```bash
# QR code authentication (default)
npm run dev -- auth

# Phone number authentication
npm run dev -- auth --method phone --phone +1234567890
```

### 2. Configure Filters (Optional)

```bash
# Create default config
npm run dev -- config init

# Create config with explanatory comments
npm run dev -- config init --example

# Edit data/config.json to add filters
# Then validate
npm run dev -- config validate

# View current config
npm run dev -- config show
```

Example `data/config.json`:
```json
{
  "groups": {
    "include": ["@developers", "@resources"],
    "exclude": ["@spam"]
  },
  "files": {
    "include": ["*.pdf", "*.zip", "*.mp4"],
    "exclude": ["*.tmp"],
    "minSize": 0,
    "maxSize": null
  },
  "download": {
    "outputDir": "./data/downloads",
    "organizeByGroup": true,
    "overwriteExisting": false,
    "chunkSize": 524288,
    "concurrency": 3,
    "retryAttempts": 3,
    "retryDelay": 5000
  },
  "session": {
    "encryptSession": true,
    "sessionTimeout": 86400000
  }
}
```

### 3. Discover Files

```bash
# Discover all files in all groups
npm run dev -- discover

# Save to custom path
npm run dev -- discover --output ./my-data.json

# Only discover groups without scanning files
npm run dev -- discover --groups-only

# Update existing data file (preserves download status)
npm run dev -- discover --update
```

### 4. Download Files

```bash
# Download all discovered files
npm run dev -- download

# Use custom data file
npm run dev -- download --data ./my-data.json

# Resume failed downloads
npm run dev -- download --resume
```

### 5. Monitor Status

```bash
# View overall status
npm run dev -- status

# View detailed status with file lists
npm run dev -- status --detailed

# Check status of custom data file
npm run dev -- status --data ./my-data.json
```

## Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `run` | **Run full workflow** (auth check → discover → download) | `--data <path>` |
| `auth` | Authenticate to Telegram | `--method <qr\|phone>`, `--phone <number>` |
| `discover` | Scan groups and discover files | `--output <path>`, `--update`, `--groups-only` |
| `config` | Manage configuration | Subcommands: `init`, `validate`, `show` |
| `download` | Download discovered files (resume enabled by default) | `--data <path>`, `--resume` |
| `status` | View download progress | `--data <path>`, `--detailed` |
| `logout` | Clear authentication session | `--session-path <path>` |

## Global Options

| Option | Description |
|--------|-------------|
| `--config <path>` | Configuration file path |
| `--verbose` | Enable verbose logging |
| `--quiet` | Suppress output except errors |
| `--json` | Output results as JSON |
| `--help` | Display help |

## Development

```bash
# Build the project
npm run build

# Run in development mode
npm run dev -- <command>

# Run tests
npm test

# Run tests once
npm run test:run
```

## Project Structure

```
src/
├── auth/           # Authentication (QR code, phone/code, session)
├── discovery/      # Group and file scanning
├── download/       # File downloads with progress
├── config/         # Configuration management
├── storage/        # Data and session persistence
├── cli/            # CLI commands and interface
├── types/          # TypeScript type definitions
└── utils/          # Shared utilities

data/               # Runtime data (excluded from git)
├── config.json     # User configuration
├── data.json       # File discovery mapping
├── session/        # Encrypted Telegram session
└── downloads/      # Downloaded files by group
```

## Troubleshooting

### Authentication fails
- Ensure API ID and Hash are correct in `.env`
- Try phone authentication if QR code fails: `--method phone`

### Rate limit errors
- Telegram has strict rate limits
- The tool handles flood waits automatically
- Wait for the specified time before retrying

### Large file downloads fail
- Ensure sufficient disk space
- Files restart from beginning if interrupted (by design for US1)
- Check network stability
- Failed downloads are automatically retried on next run (resume is enabled by default)

### Session expires
- Sessions typically last months
- Re-authenticate with `npm run dev -- auth`

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.
