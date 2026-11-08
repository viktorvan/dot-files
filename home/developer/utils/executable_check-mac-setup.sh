#!/usr/bin/env bash
# Read-only check of a Mac set up from these dotfiles. Installs and changes nothing.
set -euo pipefail

export HOMEBREW_NO_AUTO_UPDATE=1
failures=0

ok() { printf '  ok    %s\n' "$1"; }
fail() {
  printf '  FAIL  %s\n' "$1"
  failures=$((failures + 1))
}
section() { printf '\n%s\n' "$1"; }

has_font() {
  local pattern=$1 dir file
  for dir in "$HOME/Library/Fonts" /Library/Fonts; do
    for file in "$dir"/$pattern; do
      [[ -e $file ]] && return 0
    done
  done
  return 1
}

# Prints the Homebrew version of a Brewfile entry, or - when Homebrew did not install it.
# Looks up the short name in one listing, because a cask name can exist in more than one tap.
print_version() {
  local name=$1 listing=$2 version
  version=$(awk -v name="${name##*/}" '$1 == name { print $2 }' <<< "$listing")
  printf '  %-34s %s\n' "$name" "${version:--}"
}

section 'Prerequisites'
for tool in brew chezmoi; do
  if command -v "$tool" > /dev/null; then ok "$tool"; else fail "$tool is not installed"; fi
done
if ! command -v brew > /dev/null || ! command -v chezmoi > /dev/null; then
  printf '\nInstall Homebrew and chezmoi first.\n'
  exit 1
fi

section 'chezmoi'
profile=$(chezmoi execute-template '{{ index . "profile" }}' 2> /dev/null || true)
if [[ $profile == work || $profile == personal ]]; then
  ok "profile: $profile"
else
  fail 'profile is not set. Run chezmoi init.'
fi
if chezmoi verify > /dev/null 2>&1; then
  ok 'managed files match the source'
else
  fail 'managed files differ from the source. Run chezmoi diff.'
fi

section 'Homebrew packages (~/.Brewfile)'
if [[ ! -f $HOME/.Brewfile ]]; then
  fail '~/.Brewfile is missing. Run chezmoi apply.'
elif brew bundle check --global --no-upgrade > /dev/null 2>&1; then
  ok 'all packages are installed'
else
  fail 'missing packages:'
  brew bundle check --global --no-upgrade --verbose 2>&1 | sed -n 's/^→ /        /p' || true
  printf '        If a third-party tap is untrusted, run brew trust --taps <tap>.\n'
fi

section 'Manual installs'
if command -v herdr > /dev/null; then ok 'herdr'; else fail 'herdr is not installed'; fi
if [[ -d /Applications/Karabiner-Elements.app ]]; then
  ok 'Karabiner-Elements'
else
  fail 'Karabiner-Elements is not installed'
fi
if has_font 'Berkeley*Mono*'; then ok 'Berkeley Mono font'; else fail 'Berkeley Mono font is missing'; fi
if has_font 'sketchybar-app-font*'; then
  ok 'SketchyBar app font'
else
  fail 'SketchyBar app font is missing'
fi
if [[ $profile == work ]]; then
  if [[ -x $HOME/dot-files/kanata/kanata ]]; then
    ok 'kanata binary'
  else
    fail 'kanata binary is missing from ~/dot-files/kanata'
  fi
fi

section 'Installed versions (for information, - means not installed by Homebrew)'
if [[ -f $HOME/.Brewfile ]]; then
  formulae=$(brew list --formula --versions 2> /dev/null || true)
  # brew list --cask fails for all casks when one tap is untrusted. The Caskroom has the same data.
  casks=$(
    for dir in "$(brew --prefix)"/Caskroom/*/; do
      [[ -d $dir ]] || continue
      version=$(ls -1 "$dir" | tail -n 1)
      printf '%s %s\n' "$(basename "$dir")" "$version"
    done
  )
  while IFS= read -r formula; do
    print_version "$formula" "$formulae"
  done < <(brew bundle list --global --formula 2> /dev/null)
  while IFS= read -r cask; do
    print_version "$cask" "$casks"
  done < <(brew bundle list --global --cask 2> /dev/null)
fi
if command -v herdr > /dev/null; then
  printf '  %-34s %s\n' herdr "$(herdr --version | awk '{print $NF}')"
fi

printf '\n'
if ((failures > 0)); then
  printf '%d check(s) failed.\n' "$failures"
  exit 1
fi
printf 'All checks passed.\n'
