return {
  "WillEhrendreich/Ionide-nvim",
  ft = { "fsharp" }, -- Only load when F# files are opened
  dependencies = {
    "mason-org/mason.nvim",
    "neovim/nvim-lspconfig",
  },
  opts = {
    IonideNvimSettings = {
      ShowSignatureOnCursorMove = false,
      FsiStdOutFileName = "./FsiOutput.txt",
      FsautocompleteCommand = { "fsautocomplete", "--project-graph-enabled", "--adaptive-lsp-server-enabled" },
      UseRecommendedServerConfig = false,
      -- FSAC 0.83+ in adaptive mode loads the projects during initialize only when this is true.
      AutomaticWorkspaceInit = true,
      AutomaticReloadWorkspace = false,
      AutomaticCodeLensRefresh = false,
      FsiCommand = "dotnet fsi",
      FsiKeymap = "vscode",
      FsiWindowCommand = "botright 10new",
      FsiFocusOnSend = false,
      EnableFsiStdOutTeeToFile = false,
      LspAutoSetup = false,
      LspRecommendedColorScheme = false,
      FsiVscodeKeymaps = true,
      StatusLine = "Ionide",
      FsiKeymapSend = "<M-cr>",
      FsiKeymapToggle = "<M-@>",
    },
    -- DOTNET_GCConserveMemory=9: let the GC compact the large object heap and keep the heap smaller.
    cmd_env = { DOTNET_GCConserveMemory = "9" },
    settings = {
      FSharp = {
        enableMSBuildProjectGraph = true,
        enableReferenceCodeLens = false,
        lineLens = { enabled = "never", prefix = "ll//" },
        codeLenses = {
          signature = { enabled = false },
          references = { enabled = false },
        },
        inlayHints = {
          enabled = true,
          typeAnnotations = false,
          disableLongTooltip = false,
          parameterNames = false,
        },
        interfaceStubGenerationObjectIdentifier = "_",
        abstractClassStubGenerationObjectIdentifier = "_",
        indentationSize = 4,
      },
    },
  },
  config = function(_, opts)
    -- LazyVim enables the Mason-installed fsautocomplete server.
    -- Ionide-nvim only returns the LSP config, so give it to that server.
    -- This plugin loads on the fsharp FileType before vim.lsp.enable starts the client.
    vim.lsp.config("fsautocomplete", require("ionide").setup(opts))

    -- Ionide's BufReadPost autocmd for *.fsproj starts the LSP with a trick:
    -- 100 ms later it runs :tcd, :e <nearest .fs>, :b <fsproj> in the CURRENT
    -- window. In a diff tab, the current window can be the file panel,
    -- so the .fsproj replaces the panel and breaks the view. Only allow the
    -- trick when the .fsproj is opened normally, outside a diff tab.
    local function in_diff_tab()
      for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
        if vim.wo[win].diff then
          return true
        end
      end
      return false
    end

    for _, au in ipairs(vim.api.nvim_get_autocmds({ group = "FSProjStartIonide" })) do
      local original = au.callback
      if type(original) == "function" then
        vim.api.nvim_del_autocmd(au.id)
        vim.api.nvim_create_autocmd(au.event, {
          group = "FSProjStartIonide",
          pattern = au.pattern,
          desc = au.desc,
          callback = function(args)
            local loaded_in_background = vim.fn.win_gettype() == "autocmd"
            local shown_here = vim.api.nvim_win_get_buf(0) == args.buf
            if loaded_in_background or not shown_here or in_diff_tab() then
              return
            end
            return original(args)
          end,
        })
      end
    end
  end,
}
