return {
  "WillEhrendreich/Ionide-nvim",
  commit = "68e648562ff6b6454eca8b42767980ab07b7a742",
  dependencies = {
    {
      "williamboman/mason.nvim",
      opts = {
        ensure_installed = {
          "fsautocomplete",
        },
      },
      {
        "neovim/nvim-lspconfig",
        opts = {
          servers = {

            ---@type IonideOptions
            ionide = {

              IonideNvimSettings = {
                -- EnableFsiStdOutTeeToFile = true,
                ShowSignatureOnCursorMove = false,
                FsiStdOutFileName = "./FsiOutput.txt",
                FsautocompleteCommand = { "fsautocomplete --project-graph-enabled --adaptive-lsp-server-enabled --use-fcs-transparent-compiler" },
                UseRecommendedServerConfig = false,
                AutomaticWorkspaceInit = false,
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
                AutocmdEvents = {
                  "LspAttach",
                  "BufEnter",
                  "BufWritePost",
                  "CursorHold",
                  "CursorHoldI",
                  "InsertEnter",
                  "InsertLeave",
                },
                FsiKeymapSend = "<M-cr>",
                FsiKeymapToggle = "<M-@>",

              },
              cmd = {
                vim.fs.normalize(vim.fn.stdpath("data") .. "/mason/bin/fsautocomplete"),
              },
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
                    -- Defaults to false, the more info the better, right?
                    disableLongTooltip = false,
                    parameterNames = false,
                  },
                  interfaceStubGenerationObjectIdentifier = "_",
                  abstractClassStubGenerationObjectIdentifier = "_",
                  indentationSize = 4,
                  -- enableTreeView = true,
                  -- fsiExtraParameters = {
                  --   "--compilertool:C:/Users/Will.ehrendreich/.dotnet/tools/.store/depman-fsproj/0.2.6/depman-fsproj/0.2.6/tools/net7.0/any",
                  -- },
                },
              },
            },
          },
          -- you can do any additional lsp server setup here
          -- return true if you don't want this server to be setup with lspconfig
          ---@type table<string, fun(server:string, opts:_.lspconfig.options):boolean?>
          setup = {
            ionide = function(_, opts)
              -- print("setup ionide")
              require("ionide").setup(opts)
            end,
            -- NOTE: returning true will make sure fsautocomplete is not setup with neovim, which is what we want if we're using Ionide-nvim
            fsautocomplete = function(_, _)
              return true
            end,
          },
        },
      },
    },
  },
}
