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
      FsautocompleteCommand = { "fsautocomplete", "--project-graph-enabled", "--adaptive-lsp-server-enabled", "--use-fcs-transparent-compiler" },
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
    -- Configure Mason to ensure fsautocomplete is installed
    require("mason").setup({
      ensure_installed = { "fsautocomplete" },
    })

    -- Configure lspconfig
    local lspconfig = require("lspconfig")

    -- Prevent fsautocomplete from being set up directly by lspconfig
    lspconfig.fsautocomplete = {
      setup = function()
        return true -- Prevents setup
      end
    }

    -- Setup Ionide
    require("ionide").setup(opts)
  end,
}
