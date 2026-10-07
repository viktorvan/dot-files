local M = {}

local window_directions = { left = "h", down = "j", up = "k", right = "l" }

function M.navigate(direction)
  local previous = vim.api.nvim_get_current_win()
  vim.cmd.wincmd(window_directions[direction])
  if vim.api.nvim_get_current_win() ~= previous then
    return
  end

  local output = vim.fn.system({ "herdr", "pane", "focus", "--current", "--direction", direction })
  if vim.v.shell_error ~= 0 then
    vim.notify("Herdr navigation failed: " .. output, vim.log.levels.WARN)
  end
end

return M
