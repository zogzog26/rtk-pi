# RTK (Reduced Token Killer) for Pi

Token-optimized CLI proxy hook for [badlogic/pi-mono](https://github.com/badlogic/pi-mono).

Automatically intercepts and rewrites bash commands using RTK, saving 60-90% tokens on common dev operations.

## Installation

### Option 1: Using npm (recommended once published)

```bash
pi install rtk-pi
```

### Option 2: Manual

```bash
# Clone this repo
git clone https://github.com/zogzog26/rtk-pi.git
cd rtk-pi

# Copy extension to Pi's extensions directory
cp rtk.ts ~/.pi/agent/extensions/
cp RTK.md ~/.pi/agent/
```

## Prerequisites

Install the RTK binary:

```bash
# Via cargo (recommended)
cargo install rtk

# Or download from releases
# https://github.com/rtk-ai/rtk/releases
```

Make sure `rtk` is in your PATH.

## Usage

Pi automatically loads extensions from `~/.pi/agent/extensions/`. After installation:

```bash
# Just run pi - the extension loads automatically
pi

# Or specify manually
pi -e ~/.pi/agent/extensions/rtk.ts
```

When Pi executes bash commands, RTK will automatically intercept and optimize them:

```
[rtk] Rewrote: git status -> rtk git status
```

## Configuration

The extension reads RTK rules from `~/.pi/agent/RTK.md` for agent context. This is automatically installed.

## Verification

```bash
# Check RTK is installed
rtk --version

# Run a test command
pi -e ~/.pi/agent/extensions/rtk.ts -p "run: git status"
```

You should see `[rtk] Rewrote:` in the output.

## How It Works

1. The extension overrides Pi's built-in bash tool with a custom one
2. Before each command executes, it calls `rtk rewrite <command>`
3. RTK outputs the optimized version (or original if no optimization available)
4. The optimized command runs instead, producing token-friendly output

## Uninstall

```bash
rm ~/.pi/agent/extensions/rtk.ts
rm ~/.pi/agent/RTK.md
```

## License

MIT
