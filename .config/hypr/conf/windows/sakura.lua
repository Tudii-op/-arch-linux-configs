hl.config({
    general = {
        gaps_in  = 8,
        gaps_out = 16,
        border_size = 2,
        col = {
            -- follows the wallpaper: primary -> tertiary -> secondary
            active_border   = { colors = {primary, tertiary, secondary}, angle = 45 },
            inactive_border = { colors = {on_primary, surface_variant}, angle = 45 },
        },
        resize_on_border = true,
        allow_tearing = false,
        layout = "dwindle",
    }
})
