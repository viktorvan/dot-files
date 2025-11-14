# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# Executes commands at the start of an interactive session.
#
# Authors:
#   Sorin Ionescu <sorin.ionescu@gmail.com>
#

# Source Prezto.
if [[ -s "${ZDOTDIR:-$HOME}/.zprezto/init.zsh" ]]; then
  source "${ZDOTDIR:-$HOME}/.zprezto/init.zsh"
fi

source ~/powerlevel10k/powerlevel10k.zsh-theme

# Customize to your needs...
export EDITOR=nvim

# Just Completions BEGIN
# Init Homebrew, which adds environment variables
eval "$(brew shellenv)"

fpath=($HOMEBREW_PREFIX/share/zsh/site-functions $fpath)
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="/Users/viktor/.local/bin:$PATH"

LANG="en_GB.UTF-8" 

export ZK_NOTEBOOK_DIR='/Users/viktor/notebook'

autoload -U compinit
compinit
# Just Completions END

eval "$(zoxide init zsh)"

# Source secret environment variables if the file exists
[[ -f ~/secrets/set_secret_env_vars.sh ]] && source ~/secrets/set_secret_env_vars.sh

alias vim=nvim
alias lg=lazygit
alias cd=z
alias ls='eza --color=always --icons --group-directories-first'
alias ll='eza -la --icons --octal-permissions --group-directories-first'
alias l='eza -bGF --header --git --color=always --group-directories-first --icons'
alias llm='eza -lbGd --header --git --sort=modified --color=always --group-directories-first --icons' 
alias la='eza --long --all --group --group-directories-first'
alias lx='eza -lbhHigUmuSa@ --time-style=long-iso --git --color-scale --color=always --group-directories-first --icons'

alias lS='eza -1 --color=always --group-directories-first --icons'
alias lt='eza --tree --level=2 --color=always --group-directories-first --icons'
alias l.="eza -a | grep -E '^\.'"

alias dn='dotnet'
alias gcoi='git checkout $(git branch | fzf)'
alias gbi="git branch --format='%(refname:short)' | fzf | xargs echo -n | pbcopy"
alias gbI="git branch --format='%(refname:short)' | fzf"


alias ycon="nvim ~/.yabairc"
alias scon="nvim ~/.skhdrc"
alias sbcon="cd ~/.config/sketchybar;nvim sketchybarrc; cd -"
alias zcon="nvim ~/.zshrc"
alias tcon="nvim ~/.tmux.conf"
alias acon="nvim ~/.aerospace.toml"
alias ncon="cd ~/.config/nvim;nvim init.lua; cd -"
alias tms=~/developer/utils/tmux-sessionizer.sh
tmw() {
  "$HOME/developer/utils/tmux-set-window-name.sh" "$(git branch --show-current)"
}
tmwn() {
  "$HOME/developer/utils/tmux-create-git-branch-window.sh $(gbI)"
}
alias opi=~/developer/utils/op-list-item.sh
alias opo=~/developer/utils/op-list-otp.sh
alias gwn=~/developer/utils/git_add_worktree.sh
alias gwe=~/developer/utils/git_add_worktree_existing.sh
alias api_run=". ~/developer/utils/start_backend.sh"


j() {
    if [ -f ".viktor.justfile" ]; then
        just -f .viktor.justfile "$@"
    else
        just "$@"
    fi
}
compdef j=just

alias uuid="uuidgen | tr -d '\n' | pbcopy"
source <(fzf --zsh)

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

. "$HOME/.local/bin/env"

[ -f "/Users/viktor/.ghcup/env" ] && . "/Users/viktor/.ghcup/env" # ghcup-env
