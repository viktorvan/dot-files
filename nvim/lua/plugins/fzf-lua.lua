return {
  "ibhagwan/fzf-lua",
  enabled = false,
  dependencies = { "nvim-mini/mini.icons" },
  keys = {
    { "<leader>,", false }
  },
  opts = function(_, opts)
    local fzf = require("fzf-lua")
    local actions = fzf.actions

    opts.win_opts = {
      files = {
        cwd_prompt = false,
        actions = {
        },
      },
    }
    opts.files = {
      cwd_prompt = false,
      actions = {
        ["ctrl-i"] = { actions.toggle_ignore },
        ["ctrl-h"] = { actions.toggle_hidden },
      },
    }
    opts.fzf_opts = {
      ["--layout"] = "default",
    }
    opts.grep = {
      actions = {
        ["ctrl-i"] = { actions.toggle_ignore },
        ["ctrl-h"] = { actions.toggle_hidden },
      },
    }

    return opts
  end
}
