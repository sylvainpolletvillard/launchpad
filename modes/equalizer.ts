const FPS = 12;
let loopTimeout;

import { average } from "../utils";

const micStatus = document.getElementById("mic_status")!

export default {
  ref: "equalizer",
  introText: "EQLZ",
  enter(pad){
    navigator.mediaDevices.getUserMedia({audio:true})
    .catch(function soundNotAllowed(error) {
      micStatus.innerHTML = "KO: "+error;
      console.error(error);
    })
    .then((stream) => {
      if(!stream) return;
      //Audio stops listening in FF without // window.persistAudioStream = stream;
      //https://bugzilla.mozilla.org/show_bug.cgi?id=965483
      //https://support.mozilla.org/en-US/questions/984179
      
      (window as any).persistAudioStream = stream;
      micStatus.innerHTML = "OK";
      var audioContent = new AudioContext();
      var audioStream = audioContent.createMediaStreamSource( stream );
      var analyser = audioContent.createAnalyser();
      audioStream.connect(analyser);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0
  
      var frequencyArray = new Uint8Array(analyser.frequencyBinCount);    
    
      //Through the frequencyArray has a length longer than 255, there seems to be no
      //significant data after this point. Not worth visualizing.     
      // We decide to take from 0 to 64 to focus on bass 
      var doDraw = function () {
        loopTimeout = setTimeout(doDraw, 1000 / FPS);
        analyser.getByteFrequencyData(frequencyArray);
        const nbFreq = 64 / 8
  
        const frequencies = [...frequencyArray]
        const lengths = new Array(8).fill(0).map((_,i) => {
          return Math.round(average(frequencies.slice(i*nbFreq, (i+1)*nbFreq)) * (1+i/8) / 32)
        })
        //console.log(lengths)
        const avgBass = Math.round(average(frequencies.slice(0, 16))) / 32
        const avgHigh = Math.round(average(frequencies.slice(32, 48))) / 32
        
        for (let i=0 ; i<8; i++) {
          for(let j=0; j<8; j++){
            if(j < lengths[i]){
              const r = Math.floor((7-i)*4 + avgBass*4)
              const g = Math.floor((16-((i-4)**2)) + Math.abs(avgBass - avgHigh)*6)
              const b = Math.floor((i)*4 + avgHigh*4)
              pad.lightCellRGB(i,j,r,g,b)
            } else {
              pad.lightCellOff(i,j)
            }
          } 
        }
      }

      doDraw();
    })    
  },

  exit(pad){
    clearTimeout(loopTimeout)
  }
}