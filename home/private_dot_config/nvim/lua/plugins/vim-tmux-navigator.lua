return {
  "christoomey/vim-tmux-navigator",
  keys = {
    -- Meta chords also reach Neovim directly in sessions without tmux.
    { "<M-m>", "<cmd>TmuxNavigateLeft<cr>" },
    { "<M-n>", "<cmd>TmuxNavigateDown<cr>" },
    { "<M-e>", "<cmd>TmuxNavigateUp<cr>" },
    { "<M-i>", "<cmd>TmuxNavigateRight<cr>" },
    { "˛", "<cmd>TmuxNavigateLeft<cr>" },
    { "‘", "<cmd>TmuxNavigateDown<cr>" },
    { "é", "<cmd>TmuxNavigateUp<cr>" },
    { "ı", "<cmd>TmuxNavigateRight<cr>" },
  },
  init = function()
    vim.g.tmux_navigator_no_mappings = 1
  end,
}
-- vim: ts=2 sts=2 sw=2 et
