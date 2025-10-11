return {
  "nvim-lspconfig",
  opts = {
    inlay_hints = { enabled = false },
    servers = {
      yamlls = {
        settings = {
          yaml = {
            schemas = {
              -- Match all docker-compose*.yml files
              ["https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json"] = {
                "docker-compose*.yml",
                "docker-compose*.yaml",
              },
            },
            schemaStore = {
              enable = true,
            },
            validate = true,
            format = {
              enable = true,
            },
          },
        },
      },
    }
  }
}

