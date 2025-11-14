return {
  "pwntester/octo.nvim",
  opts = {
    mappings = {
      submit_win = {
        approve_review = { lhs = "<C-s>", desc = "approve review" },
      },
    },
    use_local_fs = true
  },
  config = function(_, opts)
    require("octo").setup(opts)

    -- Whenever an Octo buffer with diff is shown, reset it to the global highlight namespace
    vim.api.nvim_create_autocmd("BufWinEnter", {
      callback = function(args)
        local buf = args.buf
        local ft = vim.bo[buf].filetype
        if ft == "octo" and vim.wo.diff then
          local win = vim.fn.bufwinid(buf)
          if win ~= -1 then
            vim.api.nvim_win_set_hl_ns(win, 0)
          end
        end
      end,
    })
  end,
}
