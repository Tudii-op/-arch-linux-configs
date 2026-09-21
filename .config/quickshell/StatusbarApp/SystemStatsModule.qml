import Quickshell
import Quickshell.Io
import QtQuick
import qs.CustomTheme

// CPU, RAM and disk usage as live percentages. Click opens the system monitor.
Item {
    id: statsRoot

    // Set by the keyboard navigation in StatusbarWindow.
    property bool focused: false

    property int cpu: 0
    property int ram: 0
    property int disk: 0
    // Temperatures in °C (0 = sensor not found).
    property int cpuTemp: 0
    property int diskTemp: 0

    // Previous /proc/stat totals, used to turn the counters into a usage delta.
    property real lastTotal: 0
    property real lastIdle: 0

    // Run the module's action (mouse click or keyboard Return).
    function activate(): void {
        Quickshell.execDetached(["bash", "-c",
            Quickshell.env("HOME") + "/.config/ml4w/settings/system-monitor.sh"])
    }

    implicitWidth: row.implicitWidth
    implicitHeight: row.implicitHeight

    // Highlight ring shown when selected via the keyboard.
    Rectangle {
        anchors.fill: parent
        anchors.margins: -6
        radius: 8
        color: "transparent"
        border.color: Theme.primary
        border.width: 1
        opacity: statsRoot.focused ? 1 : 0
        Behavior on opacity {
            NumberAnimation { duration: 150 }
        }
    }

    // One line each: the aggregate cpu counters, MemTotal + MemAvailable, the
    // root filesystem's used percentage, then the CPU (coretemp) and NVMe
    // temperatures in millidegrees. hwmon numbering varies between boots, so the
    // sensors are found by name.
    Process {
        id: sampler
        command: ["bash", "-c",
            "head -1 /proc/stat; "
            + "awk '/^MemTotal/{t=$2} /^MemAvailable/{a=$2} END{print t, a}' /proc/meminfo; "
            + "df --output=pcent / | tail -1; "
            + "t() { for d in /sys/class/hwmon/hwmon*; do "
            + "[ \"$(cat $d/name 2>/dev/null)\" = \"$1\" ] && cat $d/temp1_input && return; "
            + "done; echo 0; }; "
            + "echo $(t coretemp) $(t nvme)"]
        stdout: StdioCollector {
            onStreamFinished: {
                let lines = text.trim().split("\n")
                if (lines.length < 4)
                    return

                let c = lines[0].trim().split(/\s+/).slice(1).map(Number)
                let idle = c[3] + (c[4] || 0)
                let total = c.reduce((a, b) => a + b, 0)
                if (statsRoot.lastTotal > 0 && total > statsRoot.lastTotal)
                    statsRoot.cpu = Math.round(100 * (1 - (idle - statsRoot.lastIdle)
                                                          / (total - statsRoot.lastTotal)))
                statsRoot.lastTotal = total
                statsRoot.lastIdle = idle

                let m = lines[1].trim().split(/\s+/).map(Number)
                if (m[0] > 0)
                    statsRoot.ram = Math.round(100 * (1 - m[1] / m[0]))

                statsRoot.disk = parseInt(lines[2]) || 0

                let t = lines[3].trim().split(/\s+/).map(Number)
                statsRoot.cpuTemp = Math.round((t[0] || 0) / 1000)
                statsRoot.diskTemp = Math.round((t[1] || 0) / 1000)
            }
        }
    }

    Timer {
        interval: 2000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: sampler.running = true
    }

    MouseArea {
        anchors.fill: parent
        anchors.margins: -6
        cursorShape: Qt.PointingHandCursor
        onClicked: statsRoot.activate()
    }

    Row {
        id: row
        spacing: 12

        Repeater {
            model: [
                { label: "CPU",  value: statsRoot.cpu,  temp: statsRoot.cpuTemp },
                { label: "RAM",  value: statsRoot.ram,  temp: 0 },
                { label: "DISK", value: statsRoot.disk, temp: statsRoot.diskTemp }
            ]
            Row {
                spacing: 5
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: modelData.label
                    color: Theme.primary
                    opacity: 0.7
                    font.family: Theme.fontFamily
                    font.pixelSize: 11
                }
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    // Fixed width so the bar doesn't jitter as the value changes.
                    width: 34
                    text: modelData.value + "%"
                    color: Theme.primary
                    font.family: Theme.fontFamily
                    font.pixelSize: 14
                    font.bold: true
                }
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    visible: modelData.temp > 0
                    text: modelData.temp + "°"
                    color: Theme.primary
                    opacity: 0.7
                    font.family: Theme.fontFamily
                    font.pixelSize: 12
                }
            }
        }
    }
}
