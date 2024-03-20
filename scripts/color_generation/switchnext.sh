#!/usr/bin/env bash

if [ "$1" == "--noswitch" ]; then
    imgpath=$(swww query | head -1 | awk -F 'image: ' '{print $2}')
    # imgpath=$(ags run-js 'wallpaper.get(0)')
else
    cd "$HOME/Images/wallpaper/"
    # Get random image 
    # Select a random image from the directory.
    random_image=$(ls | shuf -n 1)
    
    # Now random_image is assigned, you can use it instead of yad file chooser
    imgpath="$HOME/Images/wallpaper/$random_image"
    
    screensizey=$(xrandr --current | grep '*' | uniq | awk '{print $1}' | cut -d 'x' -f2 | head -1)
    cursorposx=$(hyprctl cursorpos -j | gojq '.x' 2>/dev/null) || cursorposx=960
    cursorposy=$(hyprctl cursorpos -j | gojq '.y' 2>/dev/null) || cursorposy=540
    cursorposy_inverted=$(( screensizey - cursorposy ))
    
    if [ "$imgpath" == '' ]; then
        echo 'Aborted'
        exit 0
    fi
    
    # Set the image as wallpaper in Hyprland with a grow transition effect.
    swww img "$imgpath" --transition-step 100 --transition-fps 60 \
    --transition-type grow --transition-angle 30 --transition-duration 1 \
    --transition-pos "$cursorposx, $cursorposy_inverted"
    
fi

# Generate colors for ags n stuff
"$HOME"/.config/ags/scripts/color_generation/colorgen.sh "${imgpath}" --apply
