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
      vim.cmd("silent !cp ../main/generate_project_references.sh .")
      vim.cmd("silent !cp ../main/All.fs* .")
      vim.cmd('silent !mkdir -p .opencode/prompts')
      vim.cmd("silent !cp ../main/.opencode/prompts/*.* .opencode/prompts")
      Hooks.builtins.update_current_buffer_on_switch(type, prev_path)
    end
    Hooks.register(Hooks.type.SWITCH, onSwitch)
  end,
}
