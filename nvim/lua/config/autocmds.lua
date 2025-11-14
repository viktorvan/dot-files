-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
-- Add any additional autocmds here

vim.api.nvim_create_autocmd("FileType", {
  pattern = { "markdown" },
  callback = function()
    vim.opt_local.spell = false
  end,
})

vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function()
    vim.wo.conceallevel = 0
  end,
})

-- Make *all* diff windows use the global highlight namespace (0)
vim.api.nvim_create_autocmd({ "BufWinEnter", "WinEnter" }, {
  callback = function()
    for _, win in ipairs(vim.api.nvim_list_wins()) do
      local ok, isdiff = pcall(vim.api.nvim_get_option_value, "diff", { win = win })
      if ok and isdiff then
        vim.api.nvim_win_set_hl_ns(win, 0)
      end
    end
  end,
})

-- vim.api.nvim_create_autocmd("DirChanged", {
--   callback = function(args)
--     vim.notify("CWD changed to: " .. args.file, vim.log.levels.INFO)
--   end,
-- })


