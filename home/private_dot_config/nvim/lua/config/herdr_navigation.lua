local M = {}

local window_directions = { left = "h", down = "j", up = "k", right = "l" }

function M.navigate(direction)
  local previous = vim.api.nvim_get_current_win()
  vim.cmd.wincmd(window_directions[direction])
  if vim.api.nvim_get_current_win() ~= previous or vim.env.HERDR_ENV ~= "1" then
    return
  end

  local output = vim.fn.system({ "herdr", "pane", "focus", "--current", "--direction", direction })
  if vim.v.shell_error ~= 0 then
    vim.notify("Herdr navigation failed: " .. output, vim.log.levels.WARN)
  end
end

-- Colemak navigation. The Unicode keys are the macOS Option-key characters for m, n, e, and i.
function M.setup()
  local keys = {
    left = { "<M-m>", "˛" },
    down = { "<M-n>", "‘" },
    up = { "<M-e>", "é" },
    right = { "<M-i>", "ı" },
  }
  for direction, lhs_list in pairs(keys) do
    for _, lhs in ipairs(lhs_list) do
      vim.keymap.set("n", lhs, function()
        M.navigate(direction)
      end, { desc = "Navigate " .. direction })
    end
  end
end

return M
