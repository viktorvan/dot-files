return {
  "folke/noice.nvim",
  config = function()
    local noice = require("noice")
    noice.setup({
      routes = {
        {
          -- this is needed to filter out excessive lsp progress messages from Ionide(F#)
          -- we just check if the message contains .fs extension and skip it
          filter = {
            event = "lsp",
            kind = "progress",
            find = "ionide",
          },
          opts = { skip = true },
        },
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
        hover = {
          silent = true,
        },
      },
    })
  end,
}
