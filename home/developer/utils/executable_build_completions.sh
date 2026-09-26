mkdir -p ~/.zsh/completions
workmux completions zsh > ~/.zsh/completions/_workmux
orbit completion zsh > ~/.zsh/completions/_orbit

# in .zshrc:
# fpath=(~/.zsh/completions $HOMEBREW_PREFIX/share/zsh/site-functions $fpath)
# autoload -U compinit
# compinit
