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
EDITOR=nvim

# Just Completions BEGIN
# Init Homebrew, which adds environment variables
eval "$(brew shellenv)"

fpath=($HOMEBREW_PREFIX/share/zsh/site-functions $fpath)
export PATH="$HOME/.tmuxifier/bin:$PATH"
eval "$(tmuxifier init -)"
LANG="en_GB.UTF-8" 

autoload -U compinit
compinit
# Just Completions END


# ls-deluxe alias
alias ls='lsd'
alias l='ls -l'
alias la='ls -a'
alias lla='ls -la'
alias lt='ls --tree'

alias dn='dotnet'
alias gcoi='git checkout $(git branch | fzf)'
alias gbi="git branch --format='%(refname:short)' | fzf | xargs echo -n | pbcopy"

alias ycon="nvim ~/.yabairc"
alias scon="nvim ~/.skhdrc"
alias zcon="nvim ~/.zshrc"
alias tcon="nvim ~/.tmux.conf"
alias ncon="cd ~/.config/nvim;nvim init.lua; cd -"
alias tms=~/developer/utils/tmux-sessionizer.sh
alias tmw=~/developer/utils/tmux-windowizer.sh
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
