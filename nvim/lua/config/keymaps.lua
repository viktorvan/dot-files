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

vim.keymap.set("t", "<leader>ft", "<cmd>close<CR>", { desc = "Close Terminal" })

vim.keymap.set("n", "<C-c>", "<C-a>", { noremap = true })
vim.keymap.set("v", "<C-c>", "<C-a> gv", { noremap = true })
vim.keymap.set("v", "<C-x>", "<C-x> gv", { noremap = true })

vim.keymap.set("n", "<leader><leader>", "<CMD>Oil<CR>", { desc = "Open parent directory" })

vim.keymap.set("n", "<leader><Tab>n", "<CMD>tabnext<CR>", { desc = "Next Tab" })
vim.keymap.set("n", "<leader><Tab>p", "<CMD>tabprevious<CR>", { desc = "Previous Tab" })
vim.keymap.set("n", "<space>", ",", { desc = "Find backwards" })

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

-- Copilot toggle
create_toggle("Copilot", function()
  return not require("copilot.client").is_disabled()
end, function(state)
  local copilot = require("copilot.command")
  if state then
    copilot.enable()
  else
    copilot.disable()
  end
end, "<leader>uc")
