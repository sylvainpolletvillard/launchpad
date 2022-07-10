import { debounce_leading } from "../utils"

let pad;
let currentBoardIndex = 0;

let currentBoard: SoundBoard | null;
let audioElm, currentSoundIndex;
let isMuting = false, mutingKey;

const colors = [3,4,5,6,8,9,12,16,21,30,35,38,43,46,51,54,59]

const boards = await fetch("../soundboards/soundboards.json").then(res => res.json())

type SoundBoard = { 
    name: string,
    mapping: { [index: number]: { sound: string, color: number } }
}

function lightNote(key: string, shouldPulse: boolean = false){
    let index = Number(key)
    let i = index%8, j = Math.floor(index/8)

    if(currentBoard?.mapping[key]){
        let color = colors[(currentBoard!.mapping[key]?.color ?? 0) % colors.length]
        if(shouldPulse) pad.pulseCell(i, j, color);
        else pad.lightCell(i, j, color)
    } else {
        pad.lightCellOff(i, j)
    }
}

async function loadBoard(boardIndex){
    const boardName = boards[boardIndex % boards.length]
    currentBoard = {
        name: boardName,
        mapping: await fetch(`../soundboards/${boardName}.json`).then(res => res.json())
    }

    for(let key in currentBoard.mapping) { lightNote(key) }
}

const playSound = debounce_leading(function playSound(index){
    if(currentSoundIndex != null){ 
        audioElm.pause();
        lightNote(currentSoundIndex)
        currentSoundIndex = null
     }
    if(!currentBoard || !currentBoard.mapping[index]) return
    lightNote(index, true)
    audioElm.src = `./soundboards/${currentBoard.name}/${currentBoard.mapping[index].sound}`
    audioElm.play();
    currentSoundIndex = index
}, 100)

export default {
    ref: "soundboard",
    introText: "SB",
    enter(_pad){
        pad = _pad;
        audioElm = document.getElementById("audio")
        audioElm.addEventListener("ended", onSoundEnd)
        document.getElementById("save-button")?.addEventListener("click", saveBoard)

        loadBoard(currentBoardIndex)

        pad.on("controlchange", onControlChange)
        pad.on("noteon", onNoteOn)
    },

    exit(pad){
        pad.off("noteon", onNoteOn)
        pad.off("controlchange", onControlChange)
        audioElm.removeEventListener("ended", onSoundEnd)
        document.getElementById("save-button")?.removeEventListener("click", saveBoard)
    }
}

function onNoteOn(e) {
    console.log("noteon", e)
    if(e.note.number === pad.sideKeys.MUTE){
        toggleMute()
    } else {
        const index = pad.layout8x8.indexOf(e.note.number)
        if(isMuting){
            muteKey(index)
        } else {
            playSound(index)
        }
    }    
}

function onControlChange(e) {
    if(e.value === 0) return // note off
    if(e.controller.number === pad.controlKeys.UP){ // Touche ↑ pressed
        //loadInstrument((currentInstrumentIndex + INSTRUMENTS.length - 1) % INSTRUMENTS.length)
    }
    if(e.controller.number === pad.controlKeys.DOWN){ // Touche ↓ pressed
        //loadInstrument((currentInstrumentIndex + 1) % INSTRUMENTS.length)
    }
    if(e.controller.number === pad.controlKeys.LEFT){ // Touche ← pressed
        loadBoard((currentBoardIndex + boards.length - 1) % boards.length)
    }
    if(e.controller.number === pad.controlKeys.RIGHT){ // Touche → pressed
        loadBoard((currentBoardIndex + 1) % boards.length)
    }    
}

function muteKey(index){
    if(mutingKey == null){
        mutingKey = index
        console.log(`muting note ${mutingKey}`)
    } else if(currentBoard) {
        if(mutingKey === index){
            // change color
            const nextColor = ((currentBoard.mapping[index].color ?? 0) + 1) % colors.length
            currentBoard.mapping[index].color = nextColor
            lightNote(index, true)
            console.log(`change color of note ${mutingKey}`)
        } else {
            // move key to new index
            console.log(`swap notes ${index} ${mutingKey}`)
            let tmp = currentBoard.mapping[index]
            currentBoard.mapping[index] = currentBoard.mapping[mutingKey]
            currentBoard.mapping[mutingKey] = tmp;
            lightNote(index)
            lightNote(mutingKey)
            toggleMute(false)
        }        
    }
   
}

function onSoundEnd() {
    lightNote(currentSoundIndex)
    currentSoundIndex = null;
}

function saveBoard(){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(currentBoard?.mapping, null, '\t')], {
        type: "text/plain"
    }));
    a.setAttribute("download", `${currentBoard?.name}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function toggleMute(mute?: boolean){
    isMuting = mute === undefined ? !isMuting : mute
    if(isMuting){
        mutingKey = currentSoundIndex
    } else {
        lightNote(mutingKey, false)
        mutingKey = null
    }
    audioElm.pause()
    currentSoundIndex = null
    pad.lightKey(pad.sideKeys.MUTE, isMuting ? pad.colors.WHITE : pad.colors.BLACK)
}