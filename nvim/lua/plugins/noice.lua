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
            find = ".*.fs.*",
          },
          opts = { skip = true },
        },
      },
      presets = {
        bottom_search = false,
        lsp_doc_border = true,
      },
    })
  end,
}
