return {
  { "LazyVim/LazyVim", opts = { colorscheme = "catppuccin-latte" } },
  {
    "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    opts = {
      integrations = {
        octo = true,
        blink_cmp = true,
        harpoon = true,
        diffview = true,
        grug_far = true,
        leap = true,
        nvim_surround = true,
        telescope = {
          enabled = true,
        },
        lsp_trouble = true,
        dadbod_ui = true,
        which_key = true,
      },
      highlight_overrides = {
        latte = function(colors)
          return {
            DiffText = { bg = "#bdc7fe", fg = colors.none, bold = false, reverse = false },
          }
        end,
      },
    },
  }
}
