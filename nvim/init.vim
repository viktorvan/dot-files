"-----------
"  Plugins
"-----------
call plug#begin()
Plug 'unblevable/quick-scope'
" Trigger a highlight in the appropriate direction when pressing these keys:
let g:qs_highlight_on_keys = ['f', 'F', 't', 'T']
Plug 'machakann/vim-sandwich'
call plug#end()
runtime macros/sandwich/keymap/surround.vim

highlight QuickScopePrimary guifg='#00e600' gui=underline ctermfg=155 cterm=underline
highlight QuickScopeSecondary guifg='#00e6e6' gui=underline ctermfg=81 cterm=underline


let mapleader=','

set clipboard+=unnamedplus
set ignorecase
set smartcase

nmap <leader><CR> O<Esc>
nmap - /
nmap <leader>f /
nmap <leader>F :noh<CR>
nmap <CR> o<Esc>
nnoremap <leader>r <Cmd>call VSCodeNotify('references-view.findReferences')<CR>
nnoremap <C-J> i<CR><Esc>

xmap gc  <Plug>VSCodeCommentary
nmap gc  <Plug>VSCodeCommentary
omap gc  <Plug>VSCodeCommentary
nmap gcc <Plug>VSCodeCommentaryLine
