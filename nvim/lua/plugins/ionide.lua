-- return {}
return {
  "ionide/Ionide-vim",
  ft = "fsharp",
  dependencies = { "neovim/nvim-lspconfig" },
  init = function()
    vim.g["fsharp#lsp_codelens"] = 0
    vim.g["fsharp#show_signature_on_cursor_move"] = 0
    vim.g["fsharp#CodeLenses#Signature#Enabled"] = 0
    vim.g["fsharp#CodeLenses#References#Enabled"] = 0
    vim.g["fsharp#workspace_mode_peek_deep_level"] = 4
    vim.g["fsharp#record_stub_generation"] = 1
    vim.g["fsharp#automatic_workspace_init"] = 0
    vim.g["fsharp#fsautocomplete_command"] = {
      "fsautocomplete",
      "--project-graph-enabled",
      "--adaptive-lsp-server-enabled",
      "--use-fcs-transparent-compiler",
    }
  end,
  config = function()
    -- Function to find the nearest .fsproj file
    local function find_nearest_fsproj(starting_dir)
      local uv = vim.loop
      local function find_fsproj_in_dir(dir)
        local scandir = uv.fs_scandir(dir)
        if scandir then
          while true do
            local name, type = uv.fs_scandir_next(scandir)
            if not name then
              break
            end
            if type == "file" and name:match("%.fsproj$") then
              return dir .. "/" .. name
            end
          end
        end
        return nil
      end

      local dir = starting_dir

      while dir ~= "/" do
        local fsproj = find_fsproj_in_dir(dir)
        if fsproj then
          return fsproj
        end
        dir = uv.fs_realpath(dir .. "/..")
      end

      return nil
    end

    -- Function to load the nearest F# project
    local function load_fsharp_project()
      local buffer_path = vim.fn.expand("%:p")
      local buffer_dir = vim.fn.fnamemodify(buffer_path, ":h")

      local fsproj_path = find_nearest_fsproj(buffer_dir)

      if fsproj_path then
        vim.cmd("FSharpLoadProject " .. fsproj_path)
      else
        print("No .fsproj file found in the current directory or any parent directories.")
      end
    end

    -- Create a user command for loading the nearest .fsproj
    vim.api.nvim_create_user_command("FSharpLoadNearestProject", load_fsharp_project, { bang = true })

    -- Set up keybinding for FSharpLoadNearestProject for *.fs files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "fsharp",
      callback = function()
        vim.api.nvim_buf_set_keymap(
          0,
          "n",
          "<leader>fl",
          ":FSharpLoadNearestProject<CR>",
          { noremap = true, silent = true }
        )
      end,
    })

    vim.api.nvim_create_user_command("FSharpRefreshCodeLens", function()
      vim.lsp.codelens.refresh()
      print("[FSAC] Refreshing CodeLens")
    end, {
      bang = true,
    })

    -- Set up keybinding for FSharpRefreshCodeLens for *.fs files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "fsharp",
      callback = function()
        vim.api.nvim_buf_set_keymap(
          0,
          "n",
          "<leader>cr",
          ":FSharpRefreshCodeLens<CR>",
          { noremap = true, silent = true }
        )
      end,
    })
    -- Set up keybinding for FSharpLoadNearestProject for *.fs files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "fsharp",
      callback = function()
        vim.api.nvim_buf_set_keymap(
          0,
          "n",
          "<leader>fl",
          ":FSharpLoadNearestProject<CR>",
          { noremap = true, silent = true }
        )
      end,
    })
    -- Set up keybinding for FSharpLoadNearestProject for *.fs files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "fsharp",
      callback = function()
        vim.api.nvim_buf_set_keymap(
          0,
          "n",
          "<leader>fl",
          ":FSharpLoadNearestProject<CR>",
          { noremap = true, silent = true }
        )
      end,
    })
    -- Set up keybinding for FSharpLoadNearestProject for *.fs files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "fsharp",
      callback = function()
        vim.api.nvim_buf_set_keymap(
          0,
          "n",
          "<leader>fl",
          ":FSharpLoadNearestProject<CR>",
          { noremap = true, silent = true }
        )
      end,
    })
    -- Set up keybinding for FSharpLoadNearestProject for *.fs files
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "fsharp",
      callback = function()
        vim.api.nvim_buf_set_keymap(
          0,
          "n",
          "<leader>cr",
          ":FSharpRefreshCodeLens<CR>",
          { noremap = true, silent = true }
        )
      end,
    })
  end,
}
