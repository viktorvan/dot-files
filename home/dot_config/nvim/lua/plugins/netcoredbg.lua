return {
  enabled = vim.fn.has("macunix") == 1 and vim.uv.os_uname().machine == "arm64",
  "Cliffback/netcoredbg-macOS-arm64.nvim",
  dependencies = { "mfussenegger/nvim-dap" },
  config = function()
    require("netcoredbg-macOS-arm64").setup(require("dap"))
  end,
}
