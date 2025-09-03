# Agent Guidelines

## Code Style
- Lua files use 2 spaces for indentation (see stylua.toml)
- Maximum line length: 120 characters
- Shell scripts (.sh) should be executable and have shebang lines
- Neovim config follows modular structure in lua/plugins/ and lua/config/
- Use Lua tables for plugin configurations
- Prefer local variables over global ones in Lua

## Commands
- Lua formatting: `stylua .`
- Shell script formatting: `shfmt -i 2 -ci -w .`
- Shell script linting: `shellcheck **/*.sh`

## Conventions
- Plugin files named after the plugin they configure (e.g. catppuccin.lua)
- Use snake_case for Lua variables and functions
- Configuration files should be named without leading dots in repo
- Hammerspoon modules use camelCase (Lua)