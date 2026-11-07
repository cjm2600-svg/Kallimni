/* Original, locally synthesized calming instrumental ambience. No recordings or paid services. */
(function () {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx, master, voices = [], step = 0, timer = null, playing = false;
  let ducked = false, pausedForSpeech = false, listeners = [], saveFn = () => {};
  let prefs = {enabled:false, volume:0.3, duckMode:"lower", track:0};
  let lastError = null;
  const chords = [[196,246.94,293.66],[174.61,220,261.63],[164.81,196,246.94],[174.61,220,293.66]];
  function emit(){listeners.forEach(fn=>{try{fn(state());}catch(e){}});}
  function persist(){saveFn({...prefs});}
  function gain(){return Math.max(0,Math.min(1,prefs.volume))*(ducked?0.15:1)*0.13;}
  function adjust(){if(master&&ctx)master.gain.setTargetAtTime(gain(),ctx.currentTime,.25);}
  function stopVoices(){voices.forEach(v=>{try{v.stop();}catch(e){}});voices=[];}
  function chord(){
    if(!playing||!ctx)return;
    stopVoices();
    const notes=chords[step++%chords.length];
    notes.forEach((freq,i)=>{
      const osc=ctx.createOscillator(), env=ctx.createGain();
      osc.type="sine";osc.frequency.value=freq*(i===0?.5:1);
      env.gain.value=0;
      osc.connect(env);env.connect(master);
      const t=ctx.currentTime;
      env.gain.setValueAtTime(0,t);
      env.gain.linearRampToValueAtTime(i===0?.34:.18,t+1.5);
      env.gain.setValueAtTime(i===0?.34:.18,t+4.5);
      env.gain.linearRampToValueAtTime(0,t+6.4);
      osc.start(t);osc.stop(t+6.5);voices.push(osc);
    });
  }
  async function play(){
    if(!AudioContextClass){lastError="Audio is not supported on this device.";emit();return false;}
    try{
      if(!ctx){ctx=new AudioContextClass();master=ctx.createGain();master.connect(ctx.destination);}
      await ctx.resume();playing=true;lastError=null;adjust();
      if(timer)clearInterval(timer);
      chord();timer=setInterval(chord,6200);emit();return true;
    }catch(e){lastError="Tap play to enable audio.";emit();return false;}
  }
  function pause(){playing=false;if(timer)clearInterval(timer);timer=null;stopVoices();emit();}
  function setEnabled(on){prefs.enabled=!!on;persist();if(on)return play();pause();return Promise.resolve(false);}
  function setVolume(v){prefs.volume=Math.round(Math.max(0,Math.min(1,v))*100)/100;adjust();persist();emit();}
  function setDuckMode(v){prefs.duckMode=v==="pause"?"pause":"lower";persist();emit();}
  function duck(){
    if(!playing)return;
    if(prefs.duckMode==="pause"){pausedForSpeech=true;pause();}
    else {ducked=true;adjust();emit();}
  }
  function unduck(){
    if(pausedForSpeech){pausedForSpeech=false;if(prefs.enabled)play();}
    if(ducked){ducked=false;adjust();emit();}
  }
  function state(){return {enabled:prefs.enabled,playing,volume:prefs.volume,duckMode:prefs.duckMode,ducked:ducked||pausedForSpeech,hasTracks:true,track:{title:"Nile Evening",artist:"Original gentle ambient tones",license:"Original composition"},index:0,count:1,error:lastError};}
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing)pause();});
  window.KMusic={
    init(saved,onSave){saveFn=onSave||saveFn;if(saved)Object.assign(prefs,saved);prefs.track=0;emit();},
    play,pause,setEnabled,setVolume,setDuckMode,duck,unduck,
    next(){},prev(){},toggle(){return playing?pause():setEnabled(true);},
    onChange(fn){listeners.push(fn);},get state(){return state();}
  };
})();
