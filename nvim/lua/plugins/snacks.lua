return {
  "folke/snacks.nvim",
  keys = {
    { "<leader>ft", false }
  },
  opts = {
    dashboard = { enabled = false },
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
        width = 160,
        backdrop = { transparent = false, blend = 80 }
      }
    },
    styles = {
      scratch = {
        width = 200,
        height = 30,
        bo = { buftype = "", buflisted = false, bufhidden = "hide", swapfile = false },
        minimal = false,
        noautocmd = false,
        -- position = "right",
        zindex = 20,
        wo = { winhighlight = "NormalFloat:Normal" },
        border = "rounded",
        title_pos = "center",
        footer_pos = "center",
      }
    }
  }
}
