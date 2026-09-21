-- -----------------------------------------------------
-- General window decoration
-- name: "Default"
-- -----------------------------------------------------

hl.config({
    decoration = {
        rounding = 10,
        active_opacity = 0.95,
        inactive_opacity = 0.75,
        fullscreen_opacity = 1.0,
        rounding_power = 2,

        shadow = {
            enabled = true,
            range = 32,
            render_power = 2,
            color = "rgba(00000050)",
        },

        blur = {
            enabled   = true,
            size      = 2,
            passes    = 2,
            new_optimizations = on,
            ignore_opacity = true,
            xray = true,
            vibrancy  = 0.1696,
        },
    },
})