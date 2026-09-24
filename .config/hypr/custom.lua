-- Personal additions (loaded last by hyprland.lua, survives ML4W updates)

-- Music visualizers on the desktop background (bars + circle)
hl.on("hyprland.start", function ()
    local home = os.getenv("HOME")
    hl.exec_cmd("sleep 3 && " .. home .. "/.local/bin/cava-wallpaper autostart && " .. home .. "/.local/bin/cava-circle autostart")
end)

hl.bind("SUPER + CTRL + V", hl.dsp.exec_cmd(
    os.getenv("HOME") .. "/.local/bin/cava-wallpaper toggle && " .. os.getenv("HOME") .. "/.local/bin/cava-circle toggle"),
    { description = "Toggle background music visualizers (bars + circle)" })
