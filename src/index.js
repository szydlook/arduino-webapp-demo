// import _, { replace, values } from 'lodash';
import Chart from 'chart.js/auto';
import ko from 'knockout';
import 'purecss';
// import './style.css';
import bodyHtml from './body.html';
import SocketService from './socketservice';
const socketService = new SocketService(receive);

document.body.innerHTML = bodyHtml;

ko.extenders.numeric = function(target, precision) {
    //create a writable computed observable to intercept writes to our observable
    var result = ko.pureComputed({
        read: target,  //always return the original observables value
        write: function(newValue) {
            var current = target(),
                roundingMultiplier = Math.pow(10, precision),
                newValueAsNum = isNaN(newValue) ? 0 : +newValue,
                valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;
 
            //only write if it changed
            if (valueToWrite !== current) {
                target(valueToWrite);
            } else {
                //if the rounded value is the same, but a different value was written, force a notification for the current field
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: 'always' });
 
    //initialize with current value to make sure it is rounded appropriately
    result(target());
 
    //return the new computed observable
    return result;
};

var viewModel = {
    isConnected: ko.observable(false),
    serialPorts: ko.observableArray(),
    serialPort: ko.observable(),
    delayValue: ko.observable(1).extend({numeric: 0}),
    chartTemp: new Chart(document.getElementById("chart-temp"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Temperature",
                data: [],
                borderColor: '#8a2be2',
                borderWidth: 2,
                fill: false,
                pointStyle: 'circle',
                pointRadius: 2,
                pointHoverRadius: 4,
                // lineTension: 0,
                cubicInterpolationMode: 'monotone',
                tension: 0.4
            }],
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    display: true,
                    title: {
                      display: true,
                      text: String.fromCodePoint(8451),
                    },
                    suggestedMin: 15,
                    suggestedMax: 25
                }
            }
        }
    }),
    getSettings: ()=> {},
    setSettings: ()=> {
        socketService.writeSerial(process.env.SERIAL_PORT, `#msdelay ${viewModel.delayValue()*1000}^`)
    },
}

ko.applyBindings(viewModel);

function receive(key, value) {
    switch(key) {
        case 'temp':
            var today = new Date();
            if (viewModel.chartTemp.data.labels.length != 15) { 
                viewModel.chartTemp.data.labels.push(today.getSeconds());
                viewModel.chartTemp.data.datasets.forEach((dataset) => {
                    dataset.data.push(value);
                });
            } else {
                viewModel.chartTemp.data.labels.shift();
                viewModel.chartTemp.data.labels.push(today.getSeconds());
                viewModel.chartTemp.data.datasets.forEach((dataset) => {
                    dataset.data.shift();
                    dataset.data.push(value);
                });
            }
            viewModel.chartTemp.update();
            break;
        case 'connected':
            viewModel.isConnected(value);
            break;
    }
};