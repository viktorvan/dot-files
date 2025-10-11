return {
    "seblyng/roslyn.nvim",
    ft = "cs",
    ---@module 'roslyn.config'
    ---@type RoslynNvimConfig
    opts = {
        -- your configuration comes here; leave empty for default settings
        -- NOTE: You must configure `cmd` in `config.cmd` unless you have installed via mason

      filewatching = "roslyn",
      choose_target = function(target)

        return vim.iter(target):find(function(item)
            if string.match(item, "Auth.slnx") then
                return item
            end
          end)
      end
    }
}
