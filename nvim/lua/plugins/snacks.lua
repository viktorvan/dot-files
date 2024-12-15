return {
  "folke/snacks.nvim",
  opts = {
    terminal = {
      win = {
        position = "float",
        width = 0,
        height = 0,
        border = "rounded",
        backdrop = false
      },
    },
    zen = {
      toggles = {
        dim = false,
        git_signs = false,
        mini_diff_signs = false,
        -- diagnostics = false,
        -- inlay_hints = false,
      },
      show = {
        statusline = false, -- can only be shown when using the global statusline
        tabline = false,
      },
      win = {
        width = 140,
        backdrop = { transparent = false, blend = 80 }
      }
    }
  },
}
