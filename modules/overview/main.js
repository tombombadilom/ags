import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import { SearchAndWindows } from "./windowcontent.js";
import PopupWindow from '../.widgethacks/popupwindow.js';

export default (id = '') => PopupWindow({
    name: `overview${id}`,
    // exclusivity: 'ignore',
<<<<<<< HEAD
    keymode: 'exclusive',
=======
    keymode: 'on-demand',
>>>>>>> 4a21040 (merged new hyprland and ags version with my code)
    visible: false,
    anchor: ['top', 'bottom'],
    layer: 'overlay',
    child: Widget.Box({
        vertical: true,
        children: [
            SearchAndWindows(),
        ]
    }),
})
