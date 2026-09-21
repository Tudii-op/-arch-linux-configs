local o = vim.opt

o.number = true
o.relativenumber = true
o.cursorline = true
o.signcolumn = "yes"
o.scrolloff = 8
o.termguicolors = true
o.wrap = false
o.splitright = true
o.splitbelow = true
o.mouse = "a"
o.showmode = false -- lualine shows it
o.clipboard = "unnamedplus"

o.expandtab = true
o.shiftwidth = 4
o.tabstop = 4
o.smartindent = true

o.ignorecase = true
o.smartcase = true
o.incsearch = true
o.hlsearch = true

o.undofile = true
o.swapfile = false
o.updatetime = 250
o.timeoutlen = 400
o.completeopt = { "menu", "menuone", "noselect", "popup" }
o.list = true
o.listchars = { tab = "» ", trail = "·", nbsp = "␣" }

vim.diagnostic.config({
  virtual_text = { spacing = 2, prefix = "●" },
  severity_sort = true,
  float = { border = "rounded" },
})

-- Highlight on yank
vim.api.nvim_create_autocmd("TextYankPost", {
  callback = function() vim.hl.on_yank({ timeout = 150 }) end,
})

-- Restore last cursor position
vim.api.nvim_create_autocmd("BufReadPost", {
  callback = function(ev)
    local mark = vim.api.nvim_buf_get_mark(ev.buf, '"')
    if mark[1] > 0 and mark[1] <= vim.api.nvim_buf_line_count(ev.buf) then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})
