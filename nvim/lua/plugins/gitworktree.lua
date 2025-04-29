return {
  "polarmutex/git-worktree.nvim",
  -- version = "^2",
  dependencies = { "nvim-lua/plenary.nvim", "telescope.nvim" },
  config = function()
    local Hooks = require("git-worktree.hooks")
    local onSwitch = function(type, prev_path)
      vim.cmd("LspStop")
      -- copy the file .viktor.justfile from ../main to this folder
      vim.cmd("silent !cp ../main/.viktor.justfile .")
      Hooks.builtins.update_current_buffer_on_switch(type, prev_path)
    end
    Hooks.register(Hooks.type.SWITCH, onSwitch)
  end,
}
