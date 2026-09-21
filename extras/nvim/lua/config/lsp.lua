local servers = {
  clangd = { cmd = { "clangd", "--background-index", "--clang-tidy" } },
  basedpyright = {},
  ruff = {},
  ts_ls = {},
  html = {},
  cssls = {},
  lua_ls = {
    settings = { Lua = { diagnostics = { globals = { "vim" } }, workspace = { checkThirdParty = false } } },
  },
  bashls = {},
  rust_analyzer = {},
  gopls = {},
}

-- server name -> executable it needs
local bins = {
  clangd = "clangd",
  basedpyright = "basedpyright-langserver",
  ruff = "ruff",
  ts_ls = "typescript-language-server",
  html = "vscode-html-language-server",
  cssls = "vscode-css-language-server",
  lua_ls = "lua-language-server",
  bashls = "bash-language-server",
  rust_analyzer = "rust-analyzer",
  gopls = "gopls",
}

for name, cfg in pairs(servers) do
  if vim.fn.executable(bins[name]) == 1 then
    vim.lsp.config(name, cfg)
    vim.lsp.enable(name)
  end
end

vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(ev)
    local client = vim.lsp.get_client_by_id(ev.data.client_id)
    local map = function(keys, fn, desc)
      vim.keymap.set("n", keys, fn, { buffer = ev.buf, desc = "LSP: " .. desc })
    end
    map("gd", vim.lsp.buf.definition, "Go to definition")
    map("gr", vim.lsp.buf.references, "References")
    map("gI", vim.lsp.buf.implementation, "Implementation")
    map("K", vim.lsp.buf.hover, "Hover")
    map("<leader>rn", vim.lsp.buf.rename, "Rename")
    map("<leader>ca", vim.lsp.buf.code_action, "Code action")
    map("<leader>e", vim.diagnostic.open_float, "Line diagnostics")

    -- Native autocompletion
    if client and client:supports_method("textDocument/completion") then
      vim.lsp.completion.enable(true, client.id, ev.buf, { autotrigger = true })
    end
    if client and client:supports_method("textDocument/inlayHint") then
      vim.lsp.inlay_hint.enable(true, { bufnr = ev.buf })
    end
  end,
})
