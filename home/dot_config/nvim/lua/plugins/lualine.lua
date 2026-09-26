return {
  {
    "nvim-lualine/lualine.nvim",
    options = {
        theme = "auto"
        -- ... the rest of your lualine config
    },
    opts = function(_, opts)
      opts.sections.lualine_z = {}

    -- Load your custom spinner component
    local spinner = require("plugins.lualine.codecompanion_spinner")

    -- Add it to a section, for example 'lualine_x'
    table.insert(opts.sections.lualine_x, spinner)
    end,
  },
}
