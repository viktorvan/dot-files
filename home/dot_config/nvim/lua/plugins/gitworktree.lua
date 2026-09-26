return {
  "polarmutex/git-worktree.nvim",
  dependencies = { "nvim-lua/plenary.nvim", "telescope.nvim" },
  config = function()
    local Hooks = require("git-worktree.hooks")

    local onSwitch = function(type, prev_path)
      -- Stop all active LSP clients safely
      if vim.lsp and vim.lsp.get_clients then
        local ok, clients = pcall(vim.lsp.get_clients, {})  -- pass empty opts to satisfy LuaLS
        if ok and clients then
          for _, client in pairs(clients) do
            if client and not client:is_stopped() then
              client:stop()
            end
          end
        end
      end

      -- Your file ops (unchanged)
      vim.cmd("silent !cp ../main/.viktor.justfile .")
      vim.cmd("silent !cp ../main/generate_project_references.sh .")
      vim.cmd("silent !cp ../main/All.fs* .")
      vim.cmd("silent !mkdir -p .opencode/prompts")
      vim.cmd("silent !cp ../main/.opencode/prompts/*.* .opencode/prompts")

      Hooks.builtins.update_current_buffer_on_switch(type, prev_path)
    end

    Hooks.register(Hooks.type.SWITCH, onSwitch)
  end,
}
