return {
  {
    "nvim-lualine/lualine.nvim",
    options = {
        theme = "auto"
        -- ... the rest of your lualine config
    },
    opts = function(_, opts)
      opts.sections.lualine_z = {}
    end,
  },
}
