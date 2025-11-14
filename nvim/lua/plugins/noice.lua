return {
  "folke/noice.nvim",
  event = "VeryLazy",
  opts = {
    routes = {
      {
        filter = {
          event = "notify",
          kind = "info",
          find = "Ionide"
        },
        opts = { skip = true },
      },
    },
    presets = {
      bottom_search = false,
      lsp_doc_border = true,
    },
    lsp = {
      progress = {
        enabled = false, -- Disable LSP progress notifications UI
      },
      hover = {
        silent = true,
      },
    },
  },
  dependencies = {
    "MunifTanjim/nui.nvim",
    "rcarriga/nvim-notify",
  }
}
