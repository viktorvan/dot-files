# Integrate zimfw/duration-info with zimfw/minimal.
zstyle ':zim:duration-info' format '%F{244}%d%f '

autoload -Uz add-zsh-hook
add-zsh-hook preexec duration-info-preexec
add-zsh-hook precmd duration-info-precmd

RPS1='${duration_info}'"${RPS1}"
