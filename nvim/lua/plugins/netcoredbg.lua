return {
  "Cliffback/netcoredbg-macOS-arm64.nvim",
  dependencies = { "mfussenegger/nvim-dap" },
  config = function()
    require("netcoredbg-macOS-arm64").setup(require("dap"))
  end,
}
