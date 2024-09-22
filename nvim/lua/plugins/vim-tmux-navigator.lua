return {
  "christoomey/vim-tmux-navigator",
  keys = {
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
