return {
  "CoreyKaylor/diffbandit.nvim",
  cmd = {
    "DiffBandit",
    "DiffBanditBuffers",
    "DiffBanditFolderDiff",
    "DiffBanditGit",
    "DiffBanditGitCurrent",
    "DiffBanditCommitPanel",
    "DiffBanditGitMenu",
    "DiffBanditGitLog",
    "DiffBanditGitCommit",
    "DiffBanditGitCompare",
    "DiffBanditGitCheckout",
    "DiffBanditMerge",
    "DiffBanditLaunch",
  },
  init = function()
    -- File panel + diff, with `git diff`-style args (like :DiffviewOpen):
    --   :DiffBanditOpen            working tree changes
    --   :DiffBanditOpen main       working tree vs main (editable right side)
    --   :DiffBanditOpen <sha>      working tree vs a commit
    --   :DiffBanditOpen main...HEAD  read-only review against the merge base
    vim.api.nvim_create_user_command("DiffBanditOpen", function(opts)
      local _, err = require("diffbandit.launcher").launch(opts.fargs)
      if err then
        vim.notify(err, vim.log.levels.ERROR)
      end
    end, { nargs = "*", desc = "DiffBandit with file panel" })

    -- The commit panel maps CursorLine to a highlight with no background, so
    -- the selected file is invisible. Show it with a visible highlight.
    local panel_winhl = "VertSplit:DiffBanditSplit,WinSeparator:DiffBanditSplit,"
      .. "Normal:DiffBanditStatus,NormalNC:DiffBanditStatus,CursorLine:DiffBanditCursorLine"
    vim.api.nvim_create_autocmd({ "WinEnter", "BufWinEnter", "CursorMoved" }, {
      group = vim.api.nvim_create_augroup("DiffBanditPanelCursorLine", { clear = true }),
      callback = function()
        for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
          if vim.wo[win].winhighlight == panel_winhl then
            vim.wo[win].winhighlight = panel_winhl:gsub("CursorLine:DiffBanditCursorLine", "CursorLine:Visual")
          end
        end
      end,
    })
  end,
  config = function()
    -- Keep the default ]f / [f (internal file order, sorted by path).
    require("diffbandit").setup({
      ui = {
        -- Herdr draws Kitty images, but does not answer DiffBandit's
        -- capability probe, so "auto" falls back to text connectors.
        -- Force the image (bezier) connectors.
        connector_renderer = "kitty",
        kitty = {
          -- Under Herdr/SSH the real cell size is unknown, so DiffBandit
          -- draws at a 20x40 px estimate. A smaller size makes images
          -- faster to draw and send, but less sharp. Example: { 12, 24 }
          cell_px = { 12, 24 },
        },
      },
    })

    -- <Tab> / <S-Tab>: next / previous file in the panel order, like j / k in
    -- the panel. Outside a DiffBandit tab, the keys keep their normal behavior.
    local function in_diffbandit_tab()
      local session = require("diffbandit.state").sessions[vim.api.nvim_get_current_tabpage()]
      if not session or session.disposed then
        return nil
      end
      local win = vim.api.nvim_get_current_win()
      local panel = session.panel
      local in_panel = panel and win == panel.nav_win
      local in_diff = win == session.left_win or win == session.right_win
      if in_panel or in_diff then
        return session
      end
    end

    local function move_file(delta, fallback)
      return function()
        local session = in_diffbandit_tab()
        if not session then
          vim.api.nvim_feedkeys(vim.keycode(fallback), "n", false)
          return
        end
        local panel_mod = require("diffbandit.panel")
        local win = vim.api.nvim_get_current_win()
        if panel_mod.is_open(session) then
          panel_mod.move(session, delta)
        elseif delta > 0 then
          session:goto_next_file()
        else
          session:goto_prev_file()
        end
        if vim.api.nvim_win_is_valid(win) then
          vim.api.nvim_set_current_win(win)
        end
      end
    end

    vim.keymap.set("n", "<Tab>", move_file(1, "<Tab>"), { desc = "DiffBandit: next file" })
    vim.keymap.set("n", "<S-Tab>", move_file(-1, "<S-Tab>"), { desc = "DiffBandit: previous file" })
  end,
}
