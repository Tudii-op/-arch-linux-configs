-- Personal additions (loaded last by hyprland.lua, survives ML4W updates)

-- Music visualizer on the desktop background
hl.on("hyprland.start", function ()
    hl.exec_cmd("sleep 3 && " .. os.getenv("HOME") .. "/.local/bin/cava-wallpaper autostart")
end)

hl.bind("SUPER + CTRL + V", hl.dsp.exec_cmd(os.getenv("HOME") .. "/.local/bin/cava-wallpaper toggle"),
    { description = "Toggle background music visualizer" })
