-- ]c / [c: next / previous change, also from the file panel (like DiffBandit).
-- From the panel, the diff moves and the cursor stays in the panel.
-- At the last (first) change of a file, the first press shows a message and
-- the second press opens the next (previous) file.
local pending -- { dir, entry, line }: armed file-boundary jump

local function jump_change(dir)
  return function()
    local view = require("diffview.lib").get_current_view()
    local layout = view and view.cur_layout
    local main = layout and layout:get_main_win()
    if not (main and main:is_valid()) then
      return
    end

    -- Use the current diff pane, or the main pane when in the file panel.
    local win = vim.wo.diff and vim.api.nvim_get_current_win() or main.id
    local inline = layout.name == "diff1_inline"
    local before = vim.api.nvim_win_get_cursor(win)
    vim.api.nvim_win_call(win, function()
      if inline then
        local actions = require("diffview.actions")
        if dir > 0 then actions.next_inline_hunk() else actions.prev_inline_hunk() end
      else
        pcall(vim.cmd, "normal! " .. (dir > 0 and "]c" or "[c"))
      end
    end)
    local after = vim.api.nvim_win_get_cursor(win)

    if after[1] ~= before[1] then
      pending = nil
      vim.api.nvim_win_call(win, function()
        vim.cmd("normal! zz")
      end)
      layout:sync_scroll()
      return
    end

    -- At a file boundary. Only DiffView (not file history) has a file list.
    if not view.next_file then
      return
    end
    local entry = view.cur_entry
    if pending and pending.dir == dir and pending.entry == entry and pending.line == after[1] then
      pending = nil
      if dir < 0 then
        -- Diffview opens files at the first change. Go to the last one after
        -- its own jump has run.
        view.emitter:once("file_open_post", function()
          vim.schedule(function()
            local new_main = view.cur_layout and view.cur_layout:get_main_win()
            if not (new_main and new_main:is_valid()) then
              return
            end
            vim.api.nvim_win_call(new_main.id, function()
              local line
              repeat
                line = vim.fn.line(".")
                pcall(vim.cmd, "normal! ]c")
              until vim.fn.line(".") == line
              vim.cmd("normal! zz")
            end)
            view.cur_layout:sync_scroll()
          end)
        end)
        view:prev_file()
      else
        view:next_file()
      end
      return
    end

    pending = { dir = dir, entry = entry, line = after[1] }
    local key = dir > 0 and "]c" or "[c"
    local which = dir > 0 and "last" or "first"
    local target = dir > 0 and "next" or "previous"
    vim.notify(("At the %s change. Press %s again for the %s file."):format(which, key, target))
  end
end

local keys = {
  { "n", "]c", jump_change(1), { desc = "Next change (next file at the end)" } },
  { "n", "[c", jump_change(-1), { desc = "Previous change (previous file at the start)" } },
}

return {
  -- Maintained fork of sindrets/diffview.nvim. Same commands and keymaps.
  "dlyongemallo/diffview-plus.nvim",
  version = "*",
  opts = {
    keymaps = {
      view = keys,
      file_panel = keys,
    },
  },
  config = function(_, opts)
    require("diffview").setup(opts)

    -- Workaround: Layout:sync_scroll() restores the cursor only in the window
    -- with the most lines. When both sides have the same line count, that is
    -- the left window, and the main (right) cursor moves down by one line.
    -- Restore the main window cursor too.
    local Layout = require("diffview.scene.layout").Layout
    local sync_scroll = Layout.sync_scroll
    Layout.sync_scroll = function(self, ...)
      local main = self:get_main_win()
      local ok, cursor = pcall(vim.api.nvim_win_get_cursor, main and main.id or -1)
      sync_scroll(self, ...)
      if ok then
        pcall(vim.api.nvim_win_set_cursor, main.id, cursor)
      end
    end
  end,
}
