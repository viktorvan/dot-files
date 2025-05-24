return {
  { "LazyVim/LazyVim", opts = { colorscheme = "catppuccin-latte" } },
  { "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    opts = {
      integrations = {
        blink_cmp = true,
        harpoon = true
      },
    }
  }
}
