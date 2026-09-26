-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

vim.g.mapleader = ","
vim.g.maplocalleader = ","

-- LazyVim auto format
vim.g.autoformat = false

-- Snacks animations
-- Set to `false` to globally disable all snacks animations
vim.g.snacks_animate = false

-- LazyVim picker to use.
-- Can be one of: telescope, fzf
-- Leave it to "auto" to automatically use the picker
-- enabled with `:LazyExtras`
vim.g.lazyvim_picker = "telescope"

-- LazyVim completion engine to use.
-- Can be one of: nvim-cmp, blink.cmp
-- Leave it to "auto" to automatically use the completion engine
-- enabled with `:LazyExtras`
vim.g.lazyvim_cmp = "blink.cmp"

local osc52 = require("vim.ui.clipboard.osc52")

local function tmux_paste()
  local before = vim.fn.systemlist({ "tmux", "list-buffers", "-F", "#{buffer_name}" })[1]

  vim.fn.system({ "tmux", "refresh-client", "-l" })

  local buffer
  vim.wait(1000, function()
    buffer = vim.fn.systemlist({ "tmux", "list-buffers", "-F", "#{buffer_name}" })[1]
    return buffer ~= nil and buffer ~= "" and buffer ~= before
  end, 50)

  if not buffer or buffer == "" or buffer == before then
    return {}
  end

  local lines = vim.fn.systemlist({ "tmux", "save-buffer", "-b", buffer, "-" })
  vim.fn.system({ "tmux", "delete-buffer", "-b", buffer })

  return lines
end

local function paste(reg)
  if vim.env.TMUX then
    return tmux_paste
  end

  return osc52.paste(reg)
end

-- Copy from remote/tmux sessions to the local terminal clipboard via OSC52.
-- Paste uses tmux's client clipboard request when running inside tmux.
vim.g.clipboard = {
  name = "OSC 52",
  copy = {
    ["+"] = osc52.copy("+"),
    ["*"] = osc52.copy("*"),
  },
  paste = {
    ["+"] = paste("+"),
    ["*"] = paste("*"),
  },
}

vim.api.nvim_create_autocmd("User", {
  pattern = "VeryLazy",
  callback = function()
    vim.schedule(function()
      vim.opt.clipboard = "unnamedplus"
    end)
  end,
})
