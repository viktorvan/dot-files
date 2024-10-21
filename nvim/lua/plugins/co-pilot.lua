return {
  "zbirenbaum/copilot.lua",
  event = "InsertEnter",
  config = function()
    require("copilot").setup({
      suggestion = {
        enabled = true,
        auto_trigger = false,
        keymap = {
          accept = "<C-ö>",
          accept_word = false,
          accept_line = "<C-y>",
          next = "<C-u>",
          prev = "<C-l>",
          dismiss = "<C-j>",
        },
      },
      panel = { enabled = false },
    })
  end,
}
