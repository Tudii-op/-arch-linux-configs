import Quickshell
import QtQuick

// Menu (three bars) icon -> toggles the Sidebar app via IPC.
BarButton {
    iconSrc: "../shared/icons/menu.svg"
    onClicked: {
        Quickshell.execDetached(["qs", "ipc", "call", "sidebar", "toggle"])
    }
}
