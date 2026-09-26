return {
  'saghen/blink.cmp',
  ---@module 'blink.cmp'
  ---@type blink.cmp.Config
  opts = {
    completion = {
      menu = {
        border = 'single',
      },
      ghost_text = {
        enabled = true
      },
      documentation = { window = { border = 'single' } },
    },
    signature = { window = { border = 'single' } },
    cmdline = {
      enabled = true,
      completion =
        {
          menu = { auto_show = true },
        }
    }
  },
  opts_extend = { "sources.default" }
}
