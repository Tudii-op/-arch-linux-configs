return {
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    lazy = false,
    build = ":TSUpdate",
    config = function()
      local langs = {
        "c", "cpp", "python", "javascript", "typescript", "tsx", "html", "css",
        "lua", "bash", "rust", "go", "json", "yaml", "toml", "markdown", "markdown_inline",
      }
      -- Parsers are compiled with the tree-sitter CLI (pacman: tree-sitter-cli).
      if vim.fn.executable("tree-sitter") == 1 then
        require("nvim-treesitter").install(langs)
      end
      vim.api.nvim_create_autocmd("FileType", {
        callback = function(ev)
          if pcall(vim.treesitter.start, ev.buf) then
            vim.bo[ev.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
          end
        end,
      })
    end,
  },
  {
    "stevearc/conform.nvim",
    event = "BufWritePre",
    keys = {
      { "<leader>cf", function() require("conform").format({ lsp_format = "fallback" }) end, desc = "Format" },
    },
    opts = {
      formatters_by_ft = {
        c = { "clang-format" },
        cpp = { "clang-format" },
        python = { "ruff_format" },
        javascript = { "prettier" },
        typescript = { "prettier" },
        html = { "prettier" },
        css = { "prettier" },
        json = { "prettier" },
        lua = { "stylua" },
        sh = { "shfmt" },
        rust = { "rustfmt" },
        go = { "gofmt" },
      },
      format_on_save = { timeout_ms = 1000, lsp_format = "fallback" },
    },
  },
  { "windwp/nvim-autopairs", event = "InsertEnter", opts = {} },
  { "numToStr/Comment.nvim", event = "VeryLazy", opts = {} },
  {
    "stevearc/oil.nvim",
    lazy = false,
    keys = { { "-", "<cmd>Oil<CR>", desc = "File explorer" } },
    opts = { view_options = { show_hidden = true } },
  },
}
