return {
  "polarmutex/git-worktree.nvim",
  -- version = "^2",
  dependencies = { "nvim-lua/plenary.nvim", "telescope.nvim" },
  config = function()
    local Hooks = require("git-worktree.hooks")
    Hooks.register(Hooks.type.SWITCH, Hooks.builtins.update_current_buffer_on_switch)
  end,
}
