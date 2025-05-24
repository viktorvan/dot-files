-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

vim.keymap.set("n", "-", "/", { desc = "Search" })
vim.keymap.set(
  "n",
  "<leader>gw",
  "<cmd>lua require('telescope').extensions.git_worktree.git_worktree()<cr>",
  { desc = "Git worktrees" }
)
vim.keymap.set(
  "n",
  "<leader>gnw",
  "<cmd>lua require('telescope').extensions.git_worktree.create_git_worktree()<cr>",
  { desc = "Create new git worktree" }
)
vim.keymap.set(
  "n",
  "gr",
  "<cmd>Telescope lsp_references<CR>",
  { noremap = true, silent = true, desc = "Find all References" }
)
vim.keymap.set(
  "n",
  "gd",
  "<cmd>Telescope lsp_definitions<CR>",
  { noremap = true, silent = true, desc = "Goto Definition" }
)
vim.keymap.set(
  "n",
  "<leader>ca",
  "<cmd>lua vim.lsp.buf.code_action()<CR>",
  { noremap = true, silent = true, desc = "Code action" }
)
vim.keymap.set(
  "n",
  "<leader>rn",
  "<cmd>lua vim.lsp.buf.rename()<CR>",
  { noremap = true, silent = true, desc = "Rename refactoring" }
)
vim.keymap.set("n", "<C-j>", "i<CR><Escape>l", { noremap = true, silent = true })
vim.keymap.set("n", "<CR>", "o<Escape>l", { noremap = true, silent = true })
vim.keymap.set("n", "<S-Tab>", "<<", { noremap = true, silent = true })
vim.keymap.set("i", "<S-Tab>", "<C-d>", { noremap = true, silent = true })

vim.keymap.del("n", "<leader>ft") -- lazyvim floating terminal
vim.keymap.del("n", "<leader>fT") -- lazyvim floating terminal
vim.keymap.set("n", "<leader>t", function() Snacks.terminal(nil, { cwd = vim.fn.getcwd() }) end, { desc = "Terminal (Root Dir)" })
vim.keymap.set("t", "<leader>t", "<cmd>close<CR>", { desc = "Close Terminal" })

vim.keymap.set("n", "<C-c>", "<C-a>", { noremap = true })
vim.keymap.set("v", "<C-c>", "<C-a> gv", { noremap = true })
vim.keymap.set("v", "<C-x>", "<C-x> gv", { noremap = true })

vim.keymap.set("n", "<leader><leader>", "<CMD>Oil<CR>", { desc = "Open parent directory" })

vim.keymap.set("n", "<leader><Tab>n", "<CMD>tabnext<CR>", { desc = "Next Tab" })
vim.keymap.set("n", "<leader><Tab>p", "<CMD>tabprevious<CR>", { desc = "Previous Tab" })
vim.keymap.set("n", "<space>", ",", { desc = "Find backwards" })

vim.keymap.set("n", "<leader>wrn", "<CMD>Tmw<CR>", { desc = "Rename tmux window to current branch name" })
vim.keymap.set("n", "<leader>yy", ":let @+ = @<CR>", { desc = "Copy Default register to system clipboard" })

vim.keymap.set("n", "<leader>p", "\"0p", { desc = "paste from 0 register" })
vim.keymap.set("n", "<leader>P", "\"0P", { desc = "Paste from 0 register" })
vim.keymap.set("v", "<leader>p", "\"0p", { desc = "Paste from 0 register" })

vim.keymap.del("n", "<leader><Space>")
vim.keymap.del("n", "<leader>sg")
vim.keymap.del("n", "<leader>sG")
vim.keymap.set("n", "<leader><Space>", LazyVim.pick("files", { root = false }), { desc = "Find files (cwd)"})
vim.keymap.set("n", "<leader>sg", LazyVim.pick("live_grep", { root = false }), { desc = "Grep (cwd)"})
vim.keymap.set("n", "<leader>sG", LazyVim.pick("live_grep", { root = true }), { desc = "Grep (root)"})

-- Toggle configurations
local function create_toggle(name, get_fn, set_fn, key)
  Snacks.toggle
    .new({
      name = name,
      get = get_fn,
      set = set_fn,
    })
    :map(key)
end

-- zk
local opts = { noremap=true, silent=false }

-- Create a new note after asking for its title.
vim.api.nvim_set_keymap("n", "<leader>zn", "<Cmd>ZkNew { title = vim.fn.input('Title: ') }<CR>", opts)

-- Open notes.
vim.api.nvim_set_keymap("n", "<leader>zo", "<Cmd>ZkNotes { sort = { 'modified' } }<CR>", opts)
-- Open notes associated with the selected tags.
vim.api.nvim_set_keymap("n", "<leader>zt", "<Cmd>ZkTags<CR>", opts)

-- Search for the notes matching a given query.
vim.api.nvim_set_keymap("n", "<leader>zf", "<Cmd>ZkNotes { sort = { 'modified' }, match = { vim.fn.input('Search: ') } }<CR>", opts)
-- Search for the notes matching the current visual selection.
vim.api.nvim_set_keymap("v", "<leader>zf", ":'<,'>ZkMatch<CR>", opts)

vim.keymap.set({'n', 'x', 'o'}, 's', '<Plug>(leap)')
vim.keymap.set('n',             'S', '<Plug>(leap-from-window)')
