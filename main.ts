import './style.css'

import Launchpad from './launchpad-mk2';
import { debounce_leading } from './utils';

import Equalizer from "./modes/equalizer"
import MidiVizualizer from "./modes/midi-visualizer"
import SoundBoard from "./modes/soundboard"

const modes = [SoundBoard, Equalizer, MidiVizualizer]

const status = document.getElementById('pad_status')!

let pad;
let currentMode;

status.innerHTML = 'Not connected';

pad = new Launchpad();
pad.connect().then(() => {     // Auto-detect Launchpad
  status.innerHTML = 'Connected';

  pad.on("controlchange", e => {
    if(e.controller.number === pad.controlKeys.MIXER){
      loadMode((currentMode + 1) % modes.length)
    }
  })

  loadMode(0, pad)
});

const loadMode = debounce_leading(function (modeIndex){
  if(currentMode !== undefined){
    let previousMode = modes[currentMode]
    previousMode.exit(pad);
  }
  
  pad.clear();
  
  currentMode = modeIndex
  const mode = modes[currentMode]
  pad.sendText(mode.introText)
  document.getElementById("mode")!.textContent = mode.ref

  const sections = [...document.querySelectorAll(`section[mode]`)] as HTMLElement[]
  sections.forEach(elm => {
    elm.style.display = elm.getAttribute("mode") === mode.ref ? "block" : "none"
  })

  mode.enter(pad);
})

window.pad = pad