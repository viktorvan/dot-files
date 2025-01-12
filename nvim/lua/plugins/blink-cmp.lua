return {
  'saghen/blink.cmp',
  ---@module 'blink.cmp'
  ---@type blink.cmp.Config
  opts = {
    completion = {
      menu = {
        border = 'single',
        -- auto_show = false
      },
      -- ghost_text = {
      --   enabled = false
      -- },
      documentation = { window = { border = 'single' } },
    },
    signature = { window = { border = 'single' } },
  },
  opts_extend = { "sources.default" }
}
