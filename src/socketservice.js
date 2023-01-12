import io from 'socket.io-client';
import { Subject, BehaviorSubject, interval, timer } from 'rxjs';
import { takeUntil, filter, startWith, first, distinctUntilChanged, tap } from 'rxjs/operators';

const PACKET_START_CHAR = '(';
const PACKET_END_CHAR = ')';
const PACKET_SPLIT_CHAR = ';';
const MAX_BUFFER_SIZE = 10000;

const CMD_START_CHAR = '#';
const CMD_END_CHAR = '^';

export default class SocketService {
    constructor(receiveCallback) {
        this.receiveCallback = receiveCallback;
        this.agentInfo = {};
        this.agentFound = new BehaviorSubject(null);
        this.appMessages = new Subject();
        this.appMessages.subscribe(message => this.handleAppMessage(message));
        // this.serialMonitorMessages = new Subject();

        this.devicesList = new BehaviorSubject({
            serial: [],
            network: []
        });
        // close all opened ports
        this.devicesList
        .pipe(filter(devices => devices.serial && devices.serial.length > 0))
        .pipe(first())
        .subscribe(() => this.closeAllSerialPorts());
        
        this.error = new BehaviorSubject(null).pipe(distinctUntilChanged());
        this.socket = null;
        this.channelOpen = new BehaviorSubject(null);
        this.serialMonitorError = new BehaviorSubject(null);
        this.serialMonitorOpened = new BehaviorSubject(false);

        // this.channelOpenStatus = this.channelOpen.pipe(distinctUntilChanged());
        this.openChannel(() => this.socket.emit('command', 'list'));
        
        this.channelOpen.subscribe(x => console.log(`channnelOpen: ${x}`));
        this.wsConnect();
    }

    closeAllSerialPorts() {
        const devices = this.devicesList.getValue().serial;
        devices.forEach(device => {
          this.socket.emit('command', `close ${device.Name}`);
        });
    }  

    /**
     * Compares 2 devices list checking they contains the same ports in the same order
     * @param {Array<device>} a the first list
     * @param {Array<device>} b the second list
     */
    static devicesListAreEquals(a, b) {
        if (!a || !b || a.length !== b.length) {
            return false;
        }
        return a.every((item, index) => (b[index].Name === item.Name && b[index].IsOpen === item.IsOpen));
    }

    handleAppMessage(message) {
        // console.log(`appMessage: ${message}`);
        // Result of a list command
        if (message.Ports) {
            this.handleListMessage(message);
            this.openSerialMonitor(process.env.SERIAL_PORT, process.env.SERIAL_RATE);
        }

        // Serial monitor message
        if (message.D) {
            // this.serialMonitorMessages.next(message.D);
            // this.serialMonitorMessagesWithPort.next(message);
            console.log(message.D);
            message.D.split(PACKET_START_CHAR).forEach((packet, index) => {
                const end = packet.indexOf(PACKET_END_CHAR);
                // we have another packet started
                if (index > 0) {
                    this.buffer = "";
                }
                
                if (end > -1) {
                    var key;
                    var value = [];
                    this.buffer += packet.substr(0, end);
                    this.buffer.split(PACKET_SPLIT_CHAR).forEach((part, i) => {
                        if (i == 0) key = part;
                        else {
                            value.push(part);
                        }
                    });
        
                    this.receiveCallback.call(this, key, (value.length == 1) ? value[0] : value);
                }
                else {
                    this.buffer += packet;
                }
            });
    
            if (this.buffer.length > MAX_BUFFER_SIZE) {
                this.buffer = "";
            }
        }

        // if (message.Error) {
        //     if (message.Error.indexOf('trying to close') !== -1) {
        //         // https://github.com/arduino/arduino-create-agent#openclose-ports
        //         this.serialMonitorOpened.next(false);
        //     }
        // }
    }

    handleListMessage(message) {
        const lastDevices = this.devicesList.getValue();
        if (message.Network && !SocketService.devicesListAreEquals(lastDevices.network, message.Ports)) {
          this.devicesList.next({
            serial: lastDevices.serial,
            network: message.Ports
          });
        }
        else if (!message.Network && !SocketService.devicesListAreEquals(lastDevices.serial, message.Ports)) {
          this.devicesList.next({
            serial: message.Ports,
            network: lastDevices.network
          });
        }
        // this.openSerialMonitor("/dev/ttyACM0", process.env.SERIAL_RATE);
    }

    // gdy kanal jest otwarty wysyla komende LIST co interwal zaczyajac od samego poczatku
    openChannel(cb) {
        this.channelOpen
            .subscribe(open => {
            if (open) {
                interval(process.env.LIST_POLLING_INTERVAL)
                .pipe(startWith(0))
                .pipe(takeUntil(this.channelOpen.pipe(filter(status => !status))))
                .pipe(tap(x => console.log(`takeUntil: ${x}`)))
                .subscribe(cb); // cb - callback
            }
            else {
                this.devicesList.next({
                    serial: [],
                    network: []
                });
                // this.agentFound.next(false);
            }
        });
    };

    openSerialMonitor(port, baudrate = 9600) {
        const serialPort = this.devicesList.getValue().serial.find(p => p.Name === port);
        if (!serialPort) {
            this.receiveCallback.call(this, 'connected', false);
            return this.serialMonitorError.next(`Can't find board at ${port}`);
        }
        if (serialPort.IsOpen) {
            console.log("Post is open");
            this.receiveCallback.call(this, 'connected', true);
            return;
        }
    
        this.appMessages
          .pipe(takeUntil(this.serialMonitorOpened.pipe(filter(open => open))))
          .subscribe(message => {
            if (message.Cmd === 'Open') {
              this.serialMonitorOpened.next(true);
            }
            if (message.Cmd === 'OpenFail') {
                // ponowic laczenie kilka razy przepisac na RxJS scheduler
              this.serialMonitorError.next(`Failed to open serial monitor at ${port}`);
            }
          });
    
        this.socket.emit('command', `open ${port} ${baudrate} default`); // timed
    };

    writeSerial(port, message) {
        this.socket.emit('command', `send ${port} ${message}`);
    }

    wsConnect() {
        if (this.socket) {
            this.socket.destroy();
            delete this.socket;
            this.socket = null;
        }
        // this.socket = io(process.env.WS_ADDRESS, { transports: ["websocket", "polling"] });
        this.socket = io(process.env.WS_ADDRESS);
        // console.log(this.socket);
        this.socket.on('connect', () => {
            // console.log(this.socket);
            this.channelOpen.next(true);
        });

        this.socket.on('message', message => {
            try {
                // console.log(message);
                this.appMessages.next(JSON.parse(message));
            }
            catch (SyntaxError) {
                console.log(`syntax error json: ${SyntaxError} \n`);
                console.log(message);
                this.appMessages.next(message);
            }
        });
        // uwaga na rónicę wersji clienta i serwera !!!
        this.socket.on("connect_error", (error) => {
            this.error.next(error);
            console.log(`ERROR connect_error: ${error.message}`);
        });

        // on retry attempts wysylaj mi maila za 10 razem niepowodzenia

        this.socket.on('error', error => {
            this.socket.disconnect();// czy to zalatwia this.channelOpen.next(false);
            this.error.next(error);
            this.socket.connect();
            console.log(`ERROR socket on error: ${error}`);
        });

        this.socket.on('disconnect', (reason) => {
            // this.socket.disconnect();
            console.log(`socket on disconnect: ${reason}`);
            this.channelOpen.next(false);
            if (reason === "io server disconnect") {
                // the disconnection was initiated by the server, you need to reconnect manually
                this.socket.connect();
            }
            // else the socket will automatically try to reconnect            
        });
    }
}