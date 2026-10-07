local function navigate(direction, command)
  return function()
    if vim.env.HERDR_ENV == "1" and (not vim.env.TMUX or vim.env.TMUX == "") then
      require("config.herdr_navigation").navigate(direction)
    else
      vim.cmd(command)
    end
  end
end

return {
  "christoomey/vim-tmux-navigator",
  keys = {
    { "<M-m>", navigate("left", "TmuxNavigateLeft") },
    { "<M-n>", navigate("down", "TmuxNavigateDown") },
    { "<M-e>", navigate("up", "TmuxNavigateUp") },
    { "<M-i>", navigate("right", "TmuxNavigateRight") },
    { "˛", navigate("left", "TmuxNavigateLeft") },
    { "‘", navigate("down", "TmuxNavigateDown") },
    { "é", navigate("up", "TmuxNavigateUp") },
    { "ı", navigate("right", "TmuxNavigateRight") },
  },
  init = function()
    vim.g.tmux_navigator_no_mappings = 1
  end,
}
-- vim: ts=2 sts=2 sw=2 et
