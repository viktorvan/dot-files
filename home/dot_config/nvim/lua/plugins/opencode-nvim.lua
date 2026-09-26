return {
  "NickvanDyke/opencode.nvim",
  dependencies = {
    -- Recommended for `ask()` and `select()`.
    -- Required for `snacks` provider.
    ---@module 'snacks' <- Loads `snacks.nvim` types for configuration intellisense.
    { "folke/snacks.nvim", opts = { input = {}, picker = {}, terminal = {} } },
  },
  config = function()
    ---@type opencode.Opts
    vim.g.opencode_opts = {
      -- Your configuration, if any — see `lua/opencode/config.lua`, or "goto definition".
    }

    -- Required for `opts.events.reload`.
    vim.o.autoread = true

    -- vim.keymap.set({ "n", "x" }, "<leader>ot", function() require("opencode").ask("@this: ", { submit = true }) end, { desc = "Ask opencode @this:" })
    -- vim.keymap.set({ "n", "x" }, "<leader>op", function() require("opencode").ask("", { submit = true }) end, { desc = "Ask opencode" })
    -- vim.keymap.set({ "n", "x" }, "<leader>oa", function() require("opencode").ask_append(" ", { submit = false }) end, { desc = "Append to opencode prompt" })
    vim.keymap.set({ "n", "x" }, "<leader>ox", function() require("opencode").select() end,                          { desc = "Execute opencode action…" })
    -- vim.keymap.set("n", "<leader>on", function() require("opencode").command("agent.cycle") end,                     { desc = "Cycle opencode agent" })

    vim.keymap.set({ "n", "x" }, "go",  function() return require("opencode").operator("@this ") end,        { expr = true, desc = "Add range to opencode" })

    -- vim.keymap.set("n", "<S-C-u>", function() require("opencode").command("session.half.page.up") end,   { desc = "opencode half page up" })
    -- vim.keymap.set("n", "<S-C-d>", function() require("opencode").command("session.half.page.down") end, { desc = "opencode half page down" })

  end,
}
