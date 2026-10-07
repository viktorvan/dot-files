return {
  "tidalcycles/vim-tidal",
  ft = "tidal",
  config = function()
    -- Set up buffer-local keymaps for .tidal files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "tidal",
      callback = function()
        local opts = { buffer = true, silent = true }

        -- Send current line to Tidal
        vim.keymap.set("n", "<C-e>", ":TidalSend<CR>", opts)
        -- Send selected visual block
        vim.keymap.set("v", "<C-e>", ":TidalSend<CR>", opts)

        -- Send current paragraph/block
        -- vim.keymap.set("n", "<leader>p", ":TidalSendParagraph<CR>", opts)

        -- Stop current stream (d1)
        vim.keymap.set("n", "<leader>x", ":TidalHush<CR>", opts)

      end,
    })
  end,
}
