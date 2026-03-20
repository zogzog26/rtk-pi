# RTK - Rust Token Killer (Pi)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always prefix shell commands with `rtk` to minimize token consumption.

Examples:

```bash
rtk git status
rtk cargo test
rtk ls src/
rtk grep "pattern" src/
rtk find "*.rs" .
rtk docker ps
rtk gh pr list
```

## Meta Commands

```bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
```

## Installation Verification

```bash
rtk --version         # Should show: rtk X.Y.Z
rtk gain              # Should work (not "command not found")
which rtk             # Verify correct binary is in PATH
```

## How It Works

RTK automatically intercepts bash commands via the Pi extension and rewrites them using `rtk rewrite`. The rewritten commands produce token-optimized output that saves 60-90% on common operations.

⚠️ **Note**: Ensure `rtk` is in your PATH before running Pi.
