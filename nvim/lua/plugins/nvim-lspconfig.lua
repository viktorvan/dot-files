return {
  "neovim/nvim-lspconfig",
  opts = {
    codelens = { enabled = false },
    servers = { prolog_ls = {} },
  },
  config = function()
    -- You can copy the default capabilities from the lsp
    local capabilities = vim.lsp.protocol.make_client_capabilities()

    -- Disable the CodeLens capability
    capabilities.textDocument.codeLens = { dynamicRegistration = false }
  end,
}
