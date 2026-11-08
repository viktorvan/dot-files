# Dotfiles

Personal configuration for macOS and the Linux development VM, managed with chezmoi.

## Set up a new Mac

1. Install Homebrew.
2. Install chezmoi: `sh -c "$(curl -fsLS get.chezmoi.io)" -- -b ~/.local/bin`
3. Run `~/.local/bin/chezmoi init viktorvan/dot-files`. Select the `work` or `personal` profile.
4. Run `~/.local/bin/chezmoi diff`, then `~/.local/bin/chezmoi apply`.
5. Open a new terminal. The first shell installs the Zim modules.
6. Run `brew trust --taps anomalyco/tap felixkratz/formulae jackielii/tap nikitabobko/tap`.
7. Run `brew bundle --global`.
8. Install Herdr, Karabiner-Elements, Berkeley Mono, and the SketchyBar app font manually.
9. Run `~/developer/utils/check-mac-setup.sh`. It reports missing items and changes nothing.

## Daily use

```sh
chezmoi git pull -- --ff-only   # get changes
chezmoi diff                    # review
chezmoi apply
```

After you change a setting in the Karabiner-Elements UI, run `chezmoi re-add ~/.config/karabiner/karabiner.json`.

## Profiles

The `work` profile adds Kanata and the `kan` and `rd` aliases. Put work-only Homebrew packages in the work section of `home/dot_Brewfile.tmpl`.

## Not in this repository

Credentials, SSH keys, and application state. Restore them manually.

## Tests

```sh
CHEZMOI="$(command -v chezmoi)" python3 -m unittest discover -s tests -v
```
