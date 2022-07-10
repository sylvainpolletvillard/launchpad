import MidiPlayer from 'midi-player-js'
import Soundfont, { InstrumentName } from 'soundfont-player'
import { debounce_leading } from "../utils"

let pad, instrument;
let currentFileIndex = 0, currentInstrumentIndex = 2;
const MIDI_FILES = [
    "./midi/pokemon.mid",
    "./midi/smb.mid",
    "./midi/hyrule.mid",
    "./midi/zelda.mid",
    "./midi/tetris.mid"
]
const INSTRUMENTS = ["accordion", "acoustic_bass", "acoustic_grand_piano", "acoustic_guitar_nylon", "acoustic_guitar_steel", "agogo", "alto_sax", "banjo", "baritone_sax", "blown_bottle", "breath_noise", "bright_acoustic_piano", "celesta", "clavinet", "dulcimer", "electric_bass_finger", "electric_bass_pick", "electric_grand_piano", "electric_guitar_clean", "electric_guitar_jazz", "electric_guitar_muted", "electric_piano_1", "electric_piano_2", "fretless_bass", "fx_1_rain", "fx_3_crystal", "fx_4_atmosphere", "fx_5_brightness", "glockenspiel", "guitar_fret_noise", "gunshot", "harpsichord", "honkytonk_piano", "kalimba", "koto", "lead_4_chiff", "marimba", "melodic_tom", "music_box", "orchestral_harp", "overdriven_guitar", "pad_1_new_age", "pad_3_polysynth", "pad_4_choir", "pizzicato_strings", "shamisen", "sitar", "steel_drums", "synth_bass_1", "synth_bass_2", "synth_drum", "taiko_drum", "tango_accordion",  "timpani", "tinkle_bell", "tubular_bells", "vibraphone", "whistle", "woodblock", "xylophone"]

const ac = new AudioContext()
const Player = new MidiPlayer.Player();

Player.on('midiEvent', function(event) {
    if (event.name == 'Note on') {
        if(event.velocity == 0){
            //Note that because of a common practice called "running status" many MIDI files may use Note on events with 0 velocity in place of Note off events.
            pad.noteOff(event.noteNumber)
        } else {
            pad.noteOn(event.noteNumber, event.velocity/100, Math.floor(Math.random()*64));
            instrument && instrument.play(event.noteName, ac.currentTime, {gain:event.velocity/100});                
        }                
    }        
    if(event.name == 'Note off'){
        pad.noteOff(event.noteNumber)
    }
});

Player.on('endOfFile', function() { pad.clear() })

const loadInstrument = debounce_leading(function(instrumentIndex){
    currentInstrumentIndex = instrumentIndex;
    console.log(`Instrument: ${INSTRUMENTS[currentInstrumentIndex]}`)
    //pad.sendText(INSTRUMENTS[currentInstrumentIndex])
    Soundfont.instrument(ac, INSTRUMENTS[currentInstrumentIndex] as InstrumentName).then(_instrument => {
        instrument = _instrument
        document.getElementById("current_instrument")!.textContent = INSTRUMENTS[currentInstrumentIndex]
        return instrument
    })
}, 10)

const loadFile = debounce_leading(function (fileIndex) {
    const filePath = MIDI_FILES[fileIndex]
    const fileName = filePath.substring(filePath.lastIndexOf("/")+1, filePath.lastIndexOf("."))
    currentFileIndex = fileIndex
    Player && Player.stop();
    pad.clear();
    //pad.sendText(fileName)
    
    Promise.all([
        loadInstrument(currentInstrumentIndex),
        fetch(filePath)
            .then(res => res.blob())
            .then(blob => blob.arrayBuffer())
    ]).then(([_instrument, buffer]) => {
        Player.loadArrayBuffer(buffer);
        Player.play();
        document.getElementById("current_song")!.textContent = fileName
    })
}, 10)

export default {
    ref: "midi",
    introText: "MIDI",
    enter(_pad){
        pad = _pad;        
        loadFile(currentFileIndex)

        pad.on("controlchange", onControlChange)
    },

    exit(pad){
        Player.pause();
        pad.off("controlchange", onControlChange)
    }
}

function onControlChange(e){
    if(e.value === 0) return // note off
    if(e.controller.number === 104){ // Touche ↑ pressed                
        loadInstrument((currentInstrumentIndex + INSTRUMENTS.length - 1) % INSTRUMENTS.length)
    }
    if(e.controller.number === 105){ // Touche ↓ pressed                
        loadInstrument((currentInstrumentIndex + 1) % INSTRUMENTS.length)
    }
    if(e.controller.number === 106){ // Touche ← pressed                
        loadFile((currentFileIndex + MIDI_FILES.length - 1) % MIDI_FILES.length)
    }
    if(e.controller.number === 107){ // Touche → pressed                
        loadFile((currentFileIndex + 1) % MIDI_FILES.length)
    }
}