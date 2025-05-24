return {
    "nanozuki/tabby.nvim",
    config = function()
      local colors = {
        rosewater = "#dc8a78",
        flamingo  = "#dd7878",
        pink      = "#ea76cb",
        mauve     = "#8839ef",
        red       = "#d20f39",
        maroon    = "#e64553",
        peach     = "#fe640b",
        yellow    = "#df8e1d",
        green     = "#40a02b",
        teal      = "#179299",
        sky       = "#04a5e5",
        sapphire  = "#209fb5",
        blue      = "#1e66f5",
        lavender  = "#7287fd",
        text      = "#4c4f69",
        subtext1  = "#5c5f77",
        subtext0  = "#6c6f85",
        overlay2  = "#7c7f93",
        overlay1  = "#8c8fa1",
        overlay0  = "#9ca0b0",
        surface2  = "#acb0be",
        surface1  = "#bcc0cc",
        surface0  = "#ccd0da",
        base      = "#eff1f5",
        mantle    = "#e6e9ef",
        crust     = "#dce0e8",
      }
    local theme = {
      fill = { fg=colors.base, bg=colors.mantle },       -- tabline background
      head = { fg=colors.blue, bg=colors.mantle },           -- head element highlight
      current_tab = { fg=colors.crust, bg=colors.peach },-- current tab label highlight
      tab = { fg=colors.text, bg=colors.crust },            -- other tab label highlight
      win = { fg=colors.base, bg=colors.surface1 },            -- window highlight
      tail = { fg=colors.green, bg=colors.mantle },           -- tail element highlight
    }

    require('tabby').setup({
      line = function(line)
        return {
          {
            { '  ', hl = theme.head },
            line.sep('', theme.head, theme.fill),
          },
          line.tabs().foreach(function(tab)
            local hl = tab.is_current() and theme.current_tab or theme.tab
            return {
              line.sep(' █', hl, theme.fill),
              tab.is_current() and '' or '',
              tab.number(),
              -- tab.name(),
              -- tab.close_btn(''),
              line.sep('', hl, theme.fill),
              hl = hl,
              margin = ' ',
            }
          end),
          -- line.spacer(),
          line.wins_in_tab(line.api.get_current_tab()).foreach(function(win)
            return {
              line.sep(' █', theme.win, theme.fill),
              win.is_current() and '' or '',
              win.buf_name(),
              line.sep('', theme.win, theme.fill),
              hl = theme.win,
              margin = ' ',
            }
          end),
          -- {
          --   line.sep('█', theme.tail, theme.fill),
          --   { '  ', hl = theme.tail },
          -- },
          hl = theme.fill,
        }
      end,
      -- option = {}, -- setup modules' option,
    })
    end,
    dependencies = { "catppuccin/nvim" },
  }

