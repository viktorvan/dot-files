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

vim.api.nvim_create_user_command("MermaidPreview", function(opts)
  local lines
  if opts.range == 0 then
    lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
  else
    lines = vim.api.nvim_buf_get_lines(0, opts.line1 - 1, opts.line2, false)
  end
  local input = table.concat(lines, "\n")
  
  local diagram
  if opts.range == 0 then
    diagram = input:match("```mermaid\n(.-)```")
    if not diagram then
      vim.notify("No mermaid diagram found in buffer", vim.log.levels.WARN)
      return
    end
  else
    diagram = input
  end
  
  local svgfile = "/tmp/mermaid-preview.svg"
  local errfile = "/tmp/mermaid-preview.err"
  
  vim.fn.delete(svgfile)
  vim.fn.delete(errfile)
  
  local handle = io.popen(string.format("mmdr -e svg > %s 2> %s", svgfile, errfile), "w")
  if handle then
    handle:write(diagram)
    handle:close()
  end
  
  if vim.fn.filereadable(svgfile) == 1 and vim.fn.getfsize(svgfile) > 0 then
    vim.fn.system(string.format("tmux split-window -h 'chafa %s; $SHELL' && tmux resize-pane -Z", svgfile))
  else
    local error_msg = "Failed to render mermaid diagram"
    if vim.fn.filereadable(errfile) == 1 then
      local err_content = vim.fn.readfile(errfile)
      if #err_content > 0 then
        error_msg = error_msg .. ":\n" .. table.concat(err_content, "\n")
      end
    end
    vim.notify(error_msg, vim.log.levels.ERROR)
  end
end, { range = true })

vim.api.nvim_create_user_command("MermaidBrowser", function(opts)
  local lines
  if opts.range == 0 then
    lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
  else
    lines = vim.api.nvim_buf_get_lines(0, opts.line1 - 1, opts.line2, false)
  end
  local input = table.concat(lines, "\n")
  
  local diagram
  if opts.range == 0 then
    diagram = input:match("```mermaid\n(.-)```")
    if not diagram then
      vim.notify("No mermaid diagram found in buffer", vim.log.levels.WARN)
      return
    end
  else
    diagram = input
  end
  
  local svgfile = "/tmp/mermaid-preview.svg"
  local errfile = "/tmp/mermaid-preview.err"
  
  vim.fn.delete(svgfile)
  vim.fn.delete(errfile)
  
  local handle = io.popen(string.format("mmdr -e svg > %s 2> %s", svgfile, errfile), "w")
  if handle then
    handle:write(diagram)
    handle:close()
  end
  
  if vim.fn.filereadable(svgfile) == 1 and vim.fn.getfsize(svgfile) > 0 then
    vim.fn.system(string.format("open -a Safari %s", svgfile))
  else
    local error_msg = "Failed to render mermaid diagram"
    if vim.fn.filereadable(errfile) == 1 then
      local err_content = vim.fn.readfile(errfile)
      if #err_content > 0 then
        error_msg = error_msg .. ":\n" .. table.concat(err_content, "\n")
      end
    end
    vim.notify(error_msg, vim.log.levels.ERROR)
  end
end, { range = true })

vim.api.nvim_create_user_command("MermaidCli", function(opts)
  local lines
  if opts.range == 0 then
    lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
  else
    lines = vim.api.nvim_buf_get_lines(0, opts.line1 - 1, opts.line2, false)
  end
  local input = table.concat(lines, "\n")
  
  local diagram
  if opts.range == 0 then
    diagram = input:match("```mermaid\n(.-)```")
    if not diagram then
      vim.notify("No mermaid diagram found in buffer", vim.log.levels.WARN)
      return
    end
  else
    diagram = input
  end
  
  local mmdfile = "/tmp/mermaid-preview.mmd"
  local svgfile = "/tmp/mermaid-preview-cli.svg"
  local errfile = "/tmp/mermaid-preview-cli.err"
  
  vim.fn.delete(mmdfile)
  vim.fn.delete(svgfile)
  vim.fn.delete(errfile)
  
  vim.fn.writefile(vim.split(diagram, "\n"), mmdfile)
  
  local result = vim.fn.system(string.format("mmdc -i %s -o %s 2> %s", mmdfile, svgfile, errfile))
  local exit_code = vim.v.shell_error
  
  if exit_code == 0 and vim.fn.filereadable(svgfile) == 1 and vim.fn.getfsize(svgfile) > 0 then
    vim.fn.system(string.format("open -a 'Google Chrome' %s", svgfile))
  else
    local error_msg = "Failed to render mermaid diagram with mermaid-cli"
    if vim.fn.filereadable(errfile) == 1 then
      local err_content = vim.fn.readfile(errfile)
      if #err_content > 0 then
        error_msg = error_msg .. ":\n" .. table.concat(err_content, "\n")
      end
    end
    if result and result ~= "" then
      error_msg = error_msg .. "\n" .. result
    end
    vim.notify(error_msg, vim.log.levels.ERROR)
  end
end, { range = true })

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

