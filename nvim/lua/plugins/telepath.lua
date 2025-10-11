return {
  'rasulomaroff/telepath.nvim',
  dependencies = 'ggandor/leap.nvim',
  -- there's no sence in using lazy loading since telepath won't load the main module
  -- until you actually use mappings
  lazy = false,
  config = function()
    require('telepath').use_default_mappings()
  end
}
