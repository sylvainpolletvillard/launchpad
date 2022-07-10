import WebMidi from "webmidi"

/*
https://d2xhy469pqj8rc.cloudfront.net/sites/default/files/novation/downloads/10529/launchpad-mk2-programmers-reference-guide-v1-02.pdf
*/

export default class LaunchpadMKII {
  name = "Launchpad MK2" // The name of the device as it appears in the menu
  manufacturer =  [0, 32, 41, 2, 24] // Manufacturer's SysEx header bytes
  maxColorValue = 63 // highest per-channel color value
  layout = [
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 23, 24, 25, 26, 27, 28, 29,
    31, 32, 33, 34, 35, 36, 37, 38, 39,
    41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 52, 53, 54, 55, 56, 57, 58, 59,
    61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 72, 73, 74, 75, 76, 77, 78, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89,
    104, 105, 106, 107, 108, 109, 110, 111
  ]
  layout8x8 = [
    11, 12, 13, 14, 15, 16, 17, 18,
    21, 22, 23, 24, 25, 26, 27, 28,
    31, 32, 33, 34, 35, 36, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48,
    51, 52, 53, 54, 55, 56, 57, 58,
    61, 62, 63, 64, 65, 66, 67, 68,
    71, 72, 73, 74, 75, 76, 77, 78,
    81, 82, 83, 84, 85, 86, 87, 88,
  ]
  sideKeys = {
    RECORD_ARM: 19,
    SOLO: 29,
    MUTE: 39,
    STOP: 49,
    SEND_B: 59,
    SEND_A: 69,
    PAN: 79,
    VOLUME: 89
  }
  controlKeys = {   
    UP: 104,
    DOWN: 105,
    LEFT: 106,
    RIGHT: 107,
    SESSION: 108,
    USER1: 109,
    USER2: 110,
    MIXER: 111
  }
  colors = {
    BLACK: 0,
    WHITE: 3,
    RED: 5,
    YELLOW: 13,
    GREEN: 21,
    LIGHTBLUE: 35,
    BLUE: 43,
    PINK: 51
  }
  output: any
  input: any
  listeners: {}
  connectPromise: Promise<void> | null

  constructor() {
    this.connect()
    this.listeners = {};
  }

  connect() {
    if(this.connectPromise != null) return this.connectPromise
    this.connectPromise = new Promise((resolve, reject) => {
      WebMidi.enable((err) => {
        if (err) { reject(err) } else {
          this.output = WebMidi.getOutputByName(this.name)
          this.input = WebMidi.getInputByName(this.name)
          this.input.addListener("noteon", "all", e => this.emit("noteon", e))
          .addListener("noteoff", "all",  e => this.emit("noteoff", e))
          .addListener("controlchange", "all", e => this.emit("controlchange", e)) //e.data[2] === 127 ? this.noteOn(e) : this.noteOff(e)            
          this.clear()
          //this.sendText("|", 56, 7) // connect anim
          resolve(this)
        }
      }, true)
    })
    return this.connectPromise
  }

  sendCommand(cmd) {    
    this.output.sendSysex(this.manufacturer, cmd)
  }

  clearText() {
    this.stopText()
    this.clear()
  }

  stopText() {
    this.sendCommand([20])
  }

  sendText(message, color=2, speed=4, loop=false) {
    let parsedText = Array.from(message, (letter: string) => letter.charCodeAt(0))
    this.sendCommand([20, color, (loop?1:0), speed].concat(parsedText))
  }

  on(event, callback){
    if(!this.listeners.hasOwnProperty(event)) this.listeners[event] = [];
    this.listeners[event].push(callback)
  }

  off(event, callback?){
    if(!callback) delete this.listeners[event]
    else this.listeners[event] = (this.listeners[event] || []).filter(l => l !== callback)
  }

  clearListeners(){
    this.listeners = {};
  }

  emit(event, payload){
    (this.listeners[event] || []).forEach(callback => callback(payload))
  }

  lightKey(index, color){
    this.sendCommand([10, index, color])
  }

  lightKeyRGB(index, r,g,b){
    this.sendCommand([11, index, r,g,b])
  }

  lightCell(i,j,color){
    this.sendCommand([10, this.layout[i+j*9], color])
  }

  lightCellRGB(i,j,r,g,b){
    this.sendCommand([11, this.layout[i+j*9], r, g, b])
  }

  lightCellsRGB(cells){
    console.log(cells.flatMap(([i,j,r,g,b]) => [11, this.layout[i+j*9], r, g, b]))
    this.sendCommand(cells.flatMap(([i,j,r,g,b]) => [11, this.layout[i+j*9], r, g, b]))
  }

  lightCellOff(i,j){
    this.lightCellRGB(i,j,0,0,0)
  }
  
  lightCol(i, c){
    this.sendCommand([12, i, c])
  }

  lightRow(j, c){
    this.sendCommand([13, j, c])
  }

  lightAll(c){
    this.sendCommand([14, c])
  }

  clear(){
    this.lightAll(0)
  }

  flashCell(i,j,c){
    this.sendCommand([35, 0, this.layout[i+j*9], c])
  }

  pulseCell(i,j,c){
    this.sendCommand([40, 0, this.layout[i+j*9], c])
  }

  noteOn(note, velocity, track){
    const n = (note +32) % 64
    const i = n % 8;
    const j = Math.floor(n / 8);
    const c = Math.ceil(6-velocity*3) + (track%8)*8;
    this.pulseCell(i,j,c)
  }

  noteOff(note){
    const n = (note +32) % 64
    const i = n % 8;
    const j = Math.floor(n / 8); 
    this.lightCellOff(i,j)
  }

  playTixy(tixy){
    const pad = this;
    let startTime: Date | null = null, callback;

    try {
      callback = new Function('t', 'i', 'x', 'y', `
        try {
          with (Math) {
            return ${tixy};
          }
        } catch (error) {
          return error;
        }
      `);
    } catch (error) {
      callback = null;
    }
    
    function render() {
      let time = 0;
    
      if (startTime) {
        time = (new Date().getTime() - startTime.getTime()) / 1000;
      } else {
        startTime = new Date();
      }
    
      if (!callback) {
        setTimeout(render, 1000 / 60);
        return;
      }
    
      let index = 0;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const value = Math.max(-1, Math.min(1, Number(callback(time, index, x, y))))
    
          if(isNaN(value)) return;
          const brightness = Math.floor(Math.abs(63 * value))
          const color = value < 0 ? [brightness,0,0] : [brightness,brightness,brightness];
          pad.lightCellRGB(x,y, color[0], color[1], color[2])
          index++;
        }
      }
    
      setTimeout(render, 1000 / 30);
    }

    render();
  }

}