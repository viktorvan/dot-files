# Local Mac tooling alongside the shared Zim configuration.
[[ -d /opt/homebrew/opt/libpq/bin ]] && path=(/opt/homebrew/opt/libpq/bin $path)
[[ -r ~/.local/bin/env ]] && source ~/.local/bin/env
[[ -r ~/.ghcup/env ]] && source ~/.ghcup/env
typeset -U path
export ZK_NOTEBOOK_DIR="$HOME/notebook"
export LANG="en_GB.UTF-8"

alias cd=z
alias ls='eza --color=always --icons --group-directories-first'
alias ll='eza -la --icons --octal-permissions --group-directories-first'
alias l='eza -bGF --header --git --color=always --group-directories-first --icons'
alias llm=sc
alias la='eza --long --all --group --group-directories-first'
alias lx='eza -lbhHigUmuSa@ --time-style=long-iso --git --color-scale --color=always --group-directories-first --icons'
alias lS='eza -1 --color=always --group-directories-first --icons'
alias lt='eza --tree --level=2 --color=always --group-directories-first --icons'
alias l.="eza -a | grep -E '^\.'"
alias dn=dotnet
alias gcoi='git checkout $(git branch | fzf)'
alias gbi="git branch --format='%(refname:short)' | fzf | xargs echo -n | pbcopy"
alias gbI="git branch --format='%(refname:short)' | fzf"
alias ycon='nvim ~/.yabairc'
alias scon='nvim ~/.skhdrc'
alias sbcon='cd ~/.config/sketchybar;nvim sketchybarrc; cd -'
alias tcon='nvim ~/.tmux.conf'
alias acon='nvim ~/.aerospace.toml'
alias tms=~/developer/utils/tmux-sessionizer.sh
alias opi=~/developer/utils/op-list-item.sh
alias opo=~/developer/utils/op-list-otp.sh
alias gwn=~/developer/utils/git_add_worktree.sh
alias gwe=~/developer/utils/git_add_worktree_existing.sh
alias api_run='. ~/developer/utils/start_backend.sh --delay'
alias kan='. ~/developer/utils/kanata.sh'
alias rd=~/.local/bin/remote-dev
tmw() {
  "$HOME/developer/utils/tmux-set-window-name.sh" "$(git branch --show-current)"
}
tmwn() {
  "$HOME/developer/utils/tmux-create-git-branch-window.sh $(gbI)"
}
