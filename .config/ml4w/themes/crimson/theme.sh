#!/usr/bin/env bash
# ML4W Theme Crimson (pink, violet and red, follows the wallpaper)

# Set waybar
echo "/ml4w-crimson;/ml4w-crimson/default" > $HOME/.config/ml4w/settings/waybar-theme.sh
$HOME/.config/waybar/launch.sh &

# Set swaync
echo '@import "themes/crimson/style.css";' > $HOME/.config/swaync/style.css
swaync-client -rs

# Set launcher
echo 'rofi' > $HOME/.config/ml4w/settings/launcher

# Set walker theme
echo 'glass' > $HOME/.config/ml4w/settings/walker-theme

# Set Window Border
echo -e 'local name = "crimson.lua"\nload_variant(name,"windows")' > $HOME/.config/hypr/conf/window.lua

# Set rofi
echo '* { border-width: 2px; }' > $HOME/.config/ml4w/settings/rofi-border.rasi

# Dark mode looks best with the pink and violet glow
sed -i 's/^gtk-application-prefer-dark-theme=.*/gtk-application-prefer-dark-theme=1/' $HOME/.config/gtk-3.0/settings.ini
[ -f $HOME/.config/gtk-4.0/settings.ini ] && sed -i 's/^gtk-application-prefer-dark-theme=.*/gtk-application-prefer-dark-theme=true/' $HOME/.config/gtk-4.0/settings.ini

# Re-run matugen on the current wallpaper so everything picks up the palette
CUR=$(cat $HOME/.cache/ml4w/hyprland-dotfiles/current_wallpaper 2>/dev/null)
[ -f "$CUR" ] && $HOME/.config/ml4w/scripts/ml4w-wallpaper "$CUR" --skip > /dev/null 2>&1 &

echo ":: Theme set to Crimson"
