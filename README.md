# arduino-webapp-demo
Example of using Chart.js to visualize data from temperature sensor coming through WebSocket.

![Arduino Udo](/docs/arduino-webapp-demo1.jpg)
![Web app](/docs/arduino-webapp-demo2.png)

## Usage
Upload arduino-webapp-demo.ino to your Arduino Uno board. Install [Arduino Create Agent](https://github.com/arduino/arduino-create-agent) and create new configuration file `localhost.ini` according to [Arduino Create Agent Wiki](https://github.com/arduino/arduino-create-agent/wiki/Advanced-usage):

```ini
name = Localhost
gc = std
regex = usb|acm|com
v = true
origins = http://127.0.0.1:8000
crashreport = false
```

Restart Agent and enable created profile (localhost) from dropdown menu.
Change serial port in `.env` to your Arduino port, mine is:

```
SERIAL_PORT=/dev/cu.usbmodem641
```

Run 'npm run serve' and your browser will open on http://127.0.0.1:8000.

## License
MIT License. Inspired by the work of [Petrică Martinescu](https://github.com/petrica/arduino-arduscope).