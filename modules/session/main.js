import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import SessionScreen from "./sessionscreen.js";
import PopupWindow from '../.widgethacks/popupwindow.js';

<<<<<<< HEAD
export default (id = '') => PopupWindow({ // On-screen keyboard
=======
export default (id = 0) => PopupWindow({ // On-screen keyboard
>>>>>>> 4a21040 (merged new hyprland and ags version with my code)
    name: `session${id}`,
    visible: false,
    keymode: 'on-demand',
    layer: 'overlay',
    exclusivity: 'ignore',
    anchor: ['top', 'bottom', 'left', 'right'],
    child: SessionScreen({ id: id }),
})