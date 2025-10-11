return {
  { "LazyVim/LazyVim", opts = { colorscheme = "catppuccin-latte" } },
  {
    "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    tag = "v1.10.0",
    opts = {
      integrations = {
        octo = true,
        blink_cmp = true,
        harpoon = true,
      },
    },
  }
}
