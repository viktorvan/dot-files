return {
  "olimorris/codecompanion.nvim",
  opts = {
    strategies = {
      -- Change the default chat adapter
      chat = {
        adapter = "openrouter_claude",
      },
      inline = {
        adapter = "openrouter_claude"
      },
      cmd = {
        adapter = "openrouter_claude"
      }
    },
    adapters = {
      openrouter_claude = function()
        return require("codecompanion.adapters").extend("openai_compatible", {
          env = {
            url = "https://openrouter.ai/api",
            api_key = os.getenv("OPENROUTER_API_KEY"),
            chat_url = "/v1/chat/completions",
          },
          schema = {
            model = {
              default = "anthropic/claude-3.7-sonnet",
            },
          },
        })
      end
    }
  },
  keys = {
    { "<leader>at", "<cmd>CodeCompanionChat Toggle<cr>", desc = "CodeCompanion toggle Chat" },
    { "<leader>ac", "<cmd>CodeCompanionActions<cr>", desc = "CodeCompanion action palette" },
    { "<leader>ae", ":CodeCompanion ", mode = { "n", "v" }, desc = "CodeCompanion inline" },
  },
    dependencies = {
      "nvim-lua/plenary.nvim",
      "nvim-treesitter/nvim-treesitter",
      "nvim-lualine/lualine.nvim",
    },
}

