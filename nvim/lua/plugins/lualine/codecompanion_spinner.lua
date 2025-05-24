local M = require("lualine.component"):extend()

M.processing = false
M.spinner_index = 1

local spinner_symbols = { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" }

local ai_icon = "󰧑 "

function M:init(options)
  M.super.init(self, options)

  local group = vim.api.nvim_create_augroup("CodeCompanionHooks", { clear = true })

  vim.api.nvim_create_autocmd("User", {
    pattern = "CodeCompanionRequest*",
    group = group,
    callback = function(event)
      if event.match == "CodeCompanionRequestStarted" then
        self.processing = true
      elseif event.match == "CodeCompanionRequestFinished" then
        self.processing = false
      end
    end,
  })
end

function M:update_status()
  if self.processing then
    self.spinner_index = (self.spinner_index % #spinner_symbols) + 1
    return ai_icon .. spinner_symbols[self.spinner_index]
  end
  return ""
end

return M
