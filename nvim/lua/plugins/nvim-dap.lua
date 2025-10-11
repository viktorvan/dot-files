return {
  "mfussenegger/nvim-dap",
  dependencies = {
    "rcarriga/nvim-dap-ui",
    "jay-babu/mason-nvim-dap.nvim",
    "GustavEikaas/easy-dotnet.nvim",
  },
  config = function()
    local dap = require("dap")

    -- point to netcoredbg from Mason
    local mason = vim.fn.stdpath("data")
    dap.adapters.coreclr = {
      type = "executable",
      command = mason .. "/mason/packages/netcoredbg/netcoredbg",
      args = { "--interpreter=vscode" },
    }

    -- use EasyDotnet helpers to pick the right DLL + env
    local dotnet = require("easy-dotnet")

    local function pick_dll()
      -- resolves the Debug build dll of the current project/selection
      return dotnet.get_debug_dll()
    end

    local function env_from_launchsettings()
      -- reads launchSettings.json env; uses default profile if available
      return dotnet.get_environment_variables(nil, nil, true)
    end

    for _, ft in ipairs({ "cs", "fs", "fsharp" }) do
      dap.configurations[ft] = {
        {
          type = "coreclr",
          name = "Launch (EasyDotnet DLL)",
          request = "launch",
          program = pick_dll,
          cwd = "${workspaceFolder}",
          env = env_from_launchsettings,
          stopAtEntry = false,
        },
        {
          type = "coreclr",
          name = "Attach to process",
          request = "attach",
          processId = require("dap.utils").pick_process,
        },
      }
    end
  end,
}
