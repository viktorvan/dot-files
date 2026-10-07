local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
      { out, "WarningMsg" },
      { "\nPress any key to exit..." },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end

vim.opt.rtp:prepend(lazypath)
-- The codelenses settings have been changed in fsac, but maybe not yet fixed in ionide.
vim.g.LanguageClient_useVirtualText = "Diagnostics"

-- only use conjure for clojure 
vim.g["conjure#filetypes"] = { "clojure" } -- restrict to just these

require("lazy").setup({
  ui = {
    border = "rounded",
    backdrop = 100,
  },
  spec = {
    -- add LazyVim and import its plugins
    { "LazyVim/LazyVim", import = "lazyvim.plugins" },
    -- import/override with your plugins
    { import = "plugins" },
    opts = {
      colorscheme = "catppuccin-latte",
    },
  },
  defaults = {
    -- By default, only LazyVim plugins will be lazy-loaded. Your custom plugins will load during startup.
    -- If you know what you're doing, you can set this to `true` to have all your custom plugins lazy-loaded by default.
    lazy = false,
    -- It's recommended to leave version=false for now, since a lot the plugin that support versioning,
    -- have outdated releases, which may break your Neovim install.
    version = false, -- always use the latest git commit
    -- version = "*", -- try installing the latest stable version for plugins that support semver
  },
  -- install = { colorscheme = { "catppuccin" } },
  checker = {
    enabled = true, -- check for plugin updates periodically
    notify = false, -- notify on update
  }, -- automatically check for plugin updates
  performance = {
    rtp = {
      -- disable some rtp plugins
      disabled_plugins = {
        "gzip",
        -- "matchit",
        -- "matchparen",
        -- "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})

require("config.tailwind")

require("telescope").load_extension("git_worktree")

vim.api.nvim_create_user_command('Tmw', function()
  vim.fn.system('zsh -c "$HOME/developer/utils/tmux-set-window-name.sh $(git branch --show-current)"')
end, {})

local finders = require('telescope.finders')
local pickers = require('telescope.pickers')
local conf = require('telescope.config').values
local actions = require('telescope.actions')
local action_state = require('telescope.actions.state')

local function delete_snacks_scratch_file()
    local predefined_directory = vim.fn.stdpath("data") .. "/scratch"

    -- List files using the built-in `vim.fs.dir()`
    local files = {}
    for name, type in vim.fs.dir(predefined_directory) do
        if type == "file" then
            table.insert(files, predefined_directory .. "/" .. name)
        end
    end

    pickers.new({}, {
        prompt_title = "Delete File",
        finder = finders.new_table({ results = files }),
        sorter = conf.generic_sorter({}),
        previewer = conf.file_previewer({}),
        attach_mappings = function(prompt_bufnr, _)
            actions.select_default:replace(function()
                local selection = action_state.get_selected_entry()
                if not selection then return end
                local filepath = selection[1]
                actions.close(prompt_bufnr)
                vim.fn.delete(filepath)
            end)
            return true
        end,
    }):find()
end

vim.api.nvim_create_user_command('ScratchDelete', delete_snacks_scratch_file, {})

require('leap').opts.preview_filter = function () return false end
require('leap').opts.labels = "ntesiroamplfuwyhdcxgbNTESIROAMPLFUWYHDCXGB"
-- s", "f", "n", "u", "t", "/", "S", "F", "N", "L", "H", "M", "U", "G", "T", "Z", "?"
require('leap').opts.safe_labels = "ntsfroa"
