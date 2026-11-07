/* Kallimni: original Egyptian-inspired oud and ney study ambience.
   Procedural Web Audio composition; offline, no recordings, no paid APIs. */
(function () {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx, master, toneBus, reverbDelay, feedback, wet, voices = [], timer = null, playing = false;
  let ducked = false, pausedForSpeech = false, listeners = [], saveFn = () => {};
  let prefs = { enabled:false, volume:0.3, duckMode:"lower", track:0 };
  let lastError = null, bar = 0, generation = 0, playedBars = 0;
  const TRACK_BARS = 32;
  const tracks = [
    {title:"Nile After Sunset",artist:"Oud & ney · warm evening",license:"Original composition",tempo:0.72,root:146.8324,mode:[0,1,4,5,7,8,10],style:0},
    {title:"Cairo at Dawn",artist:"Gentle oud · morning light",license:"Original composition",tempo:0.82,root:164.8138,mode:[0,2,3,5,7,8,10],style:1},
    {title:"Moonlight in Alexandria",artist:"Qanun-inspired strings · sea breeze",license:"Original composition",tempo:0.89,root:174.6141,mode:[0,2,4,5,7,9,10],style:2},
    {title:"Siwa Oasis",artist:"Airy ney · desert stillness",license:"Original composition",tempo:1.02,root:130.8128,mode:[0,2,3,5,7,8,10],style:3},
    {title:"Evening in Old Cairo",artist:"Traditional-style oud · quiet streets",license:"Original composition",tempo:0.76,root:146.8324,mode:[0,1,4,5,7,8,10],style:4}
  ];
  const currentTrack = () => tracks[prefs.track] || tracks[0];
  
  const D3 = 146.8324, D4 = 293.6648;
  // Original 8-bar melody in a Hijaz-flavoured D scale: D Eb F# G A Bb C.
  const melody = [
    [[0,0,1.6],[2,1.8,.8],[3,2.9,.9],[4,4,1.5]],
    [[5,0,1.1],[4,1.3,1.1],[3,2.7,1.3],[2,4.3,1]],
    [[0,0,1.7],[1,2,1],[2,3.3,.8],[3,4.5,1]],
    [[4,0,1.5],[3,1.9,.8],[2,3.1,.8],[0,4.2,1.5]],
    [[4,0,1.4],[5,1.8,.8],[6,3,.8],[5,4.2,1]],
    [[4,0,1.6],[3,1.9,1.1],[2,3.5,1]],
    [[1,0,1.1],[2,1.5,1],[3,2.8,1.2],[1,4.4,.9]],
    [[0,0,2.2],[4,2.8,.8],[2,4,1],[0,5,1]]
  ];
  const semitones = [0,1,4,5,7,8,10];
  const freq = (degree, base = currentTrack().root*2) => base * Math.pow(2, currentTrack().mode[degree]/12);
  const active = new Set();
  function emit(){listeners.forEach(fn=>{try{fn(state());}catch(e){}});}
  function persist(){saveFn({...prefs});}
  function gain(){return Math.max(0,Math.min(1,prefs.volume))*(ducked?0.13:1)*0.27;}
  function adjust(){if(master&&ctx)master.gain.setTargetAtTime(gain(),ctx.currentTime,.18);}
  function connectVoice(node){node.connect(toneBus);}
  function trackNode(osc){active.add(osc);osc.onended=()=>active.delete(osc);}
  function oscAt(type,f,t,duration,attack,peak,release,filterFreq){
    const osc=ctx.createOscillator(),env=ctx.createGain(),lp=ctx.createBiquadFilter();
    osc.type=type;osc.frequency.setValueAtTime(f,t);
    lp.type="lowpass";lp.frequency.value=filterFreq;
    env.gain.setValueAtTime(0,t);
    env.gain.linearRampToValueAtTime(peak,t+attack);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001,peak*.35),t+Math.max(attack+.04,duration-release));
    env.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(lp);lp.connect(env);connectVoice(env);
    osc.start(t);osc.stop(t+duration+.03);trackNode(osc);
  }
  function oud(f,t,d=.75,level=1){
    // Soft plucked harmonics, quick attack and woody decay, not a piano chord.
    const len=Math.max(.18,d);
    [[1,.36],[2,.12],[3,.045]].forEach(([harm,amp])=>
      oscAt("triangle",f*harm,t,len,.008,amp*level,Math.min(.23,len*.4),1400+harm*450));
  }
  function ney(f,t,d=1.5,level=1){
    // Breathy, rounded flute phrase with gentle vibrato.
    const osc=ctx.createOscillator(),vib=ctx.createOscillator(),depth=ctx.createGain();
    const lp=ctx.createBiquadFilter(),env=ctx.createGain();
    osc.type="sine";osc.frequency.setValueAtTime(f,t);
    vib.type="sine";vib.frequency.value=4.8;depth.gain.value=f*.0022;
    vib.connect(depth);depth.connect(osc.frequency);
    lp.type="lowpass";lp.frequency.value=1150;
    env.gain.setValueAtTime(.0001,t);
    env.gain.linearRampToValueAtTime(.12*level,t+.22);
    env.gain.setValueAtTime(.11*level,t+Math.max(.23,d-.32));
    env.gain.exponentialRampToValueAtTime(.0001,t+d);
    osc.connect(lp);lp.connect(env);connectVoice(env);
    osc.start(t);vib.start(t);osc.stop(t+d+.02);vib.stop(t+d+.02);
    trackNode(osc);trackNode(vib);
  }
  function drone(t,d){
    oscAt("sine",currentTrack().root/2,t,d,.8,.09,.8,450);
    oscAt("sine",currentTrack().root,t,d,.9,.035,.8,650);
  }
  function scheduleBar(){
    if(!playing||!ctx)return;
    const tr=currentTrack(), beat=tr.tempo;
    const t=ctx.currentTime+.09;
    const variations=[
      melody[bar%melody.length],
      [[[0,0,1.7],[2,2,1],[4,3.4,1.2]],[[4,0,1.3],[3,1.8,1.1],[1,3.5,1.5]],[[2,0,1.4],[3,1.8,1],[4,3.2,1.4]],[[3,0,1.4],[2,2,1],[0,3.5,1.5]]][bar%4],
      [[[0,0,1],[2,1.5,1],[4,3,1],[5,4.5,.8]],[[4,0,1],[2,1.5,1],[1,3,1],[0,4.5,.9]],[[3,0,1],[4,1.5,1],[6,3,1],[4,4.5,1]],[[2,0,1],[1,1.5,1],[0,3,2]]][bar%4],
      [[[0,0,2.6],[3,3.2,2]],[[4,0,2.5],[2,3.2,2]],[[1,0,2.6],[2,3.2,2]],[[0,0,4.5]]][bar%4],
      [[[0,0,1],[1,1.4,.8],[2,2.5,1],[4,4,1]],[[5,0,1.2],[4,1.5,1],[2,3,1],[1,4.5,1]],[[3,0,1.4],[2,2,1],[1,3.3,.8],[0,4.5,1]],[[4,0,1.3],[3,1.8,1],[2,3.1,1],[0,4.5,1]]][bar%4]
    ];
    const events=variations[tr.style],duration=beat*6;
    drone(t,duration+.12);
    if(tr.style!==3)oud(tr.root,t,.9,tr.style===2?.35:.58);
    if(tr.style===2)for(let i=0;i<6;i++)oud(freq([0,2,4,5,4,2][i],tr.root*2),t+i*beat,.42,.28);
    else if(tr.style===4)oud(freq(4,tr.root),t+beat*3,.65,.36);
    for(const [degree,start,len] of events){
      const at=t+start*beat, f=freq(degree);
      if(tr.style!==3)oud(f,at,Math.max(.32,len*beat*.83),tr.style===2?.34:.65);
      if(tr.style===3||tr.style===0&&bar%2===0&&start===0||tr.style===1&&start>=3||tr.style===4&&bar%2===1&&start===0)
        ney(f,at+.12,Math.min(2.7,len*beat+.55),tr.style===3?.62:.46);
    }
    bar++;playedBars++;
    if(playedBars>=TRACK_BARS){
      playedBars=0;
      if(prefs.repeat==="one"){bar=0;}
      else if(prefs.repeat==="off"&&!prefs.shuffle&&prefs.track===tracks.length-1){setEnabled(false);return;}
      else {prefs.track=chooseNext(1);bar=0;persist();emit();}
    }
  }
  function chooseNext(direction){
    if(prefs.shuffle&&tracks.length>1){
      const candidates=tracks.map((_,i)=>i).filter(i=>i!==prefs.track);
      return candidates[Math.floor(Math.random()*candidates.length)];
    }
    return (prefs.track+direction+tracks.length)%tracks.length;
  }
  function switchTrack(direction){
    prefs.track=chooseNext(direction);bar=0;playedBars=0;persist();
    if(playing){pause();play();}else emit();
  }
  function setShuffle(value){prefs.shuffle=!!value;persist();emit();}
  function setRepeat(value){prefs.repeat=["all","one","off"].includes(value)?value:"all";persist();emit();}
  function tick(){if(!playing)return;scheduleBar();if(playing)timer=setTimeout(tick,currentTrack().tempo*6*1000);}
  function ensureAudio(){
    if(ctx)return;
    ctx=new AudioContextClass();
    master=ctx.createGain();toneBus=ctx.createGain();
    const lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2400;
    toneBus.connect(lp);lp.connect(master);master.connect(ctx.destination);
    // Quiet delay gives a room-like tail without external audio files.
    reverbDelay=ctx.createDelay(1);reverbDelay.delayTime.value=.27;
    feedback=ctx.createGain();feedback.gain.value=.12;
    wet=ctx.createGain();wet.gain.value=.12;
    lp.connect(reverbDelay);reverbDelay.connect(feedback);feedback.connect(reverbDelay);
    reverbDelay.connect(wet);wet.connect(master);
  }
  async function play(){
    if(!AudioContextClass){lastError="Audio is not supported on this device.";emit();return false;}
    try{
      ensureAudio();await ctx.resume();if(playing)return true;
      playing=true;lastError=null;bar=0;playedBars=0;generation++;adjust();
      scheduleBar();timer=setTimeout(tick,currentTrack().tempo*6*1000);
      emit();return true;
    }catch(e){lastError="Tap play to enable audio.";emit();return false;}
  }
  function pause(){
    playing=false;generation++;if(timer)clearTimeout(timer);timer=null;
    for(const osc of active){try{osc.stop();}catch(e){}}
    active.clear();emit();
  }
  function setEnabled(on){prefs.enabled=!!on;persist();if(on)return play();pause();return Promise.resolve(false);}
  function setVolume(v){prefs.volume=Math.round(Math.max(0,Math.min(1,v))*100)/100;adjust();persist();emit();}
  function setDuckMode(v){prefs.duckMode=v==="pause"?"pause":"lower";persist();emit();}
  function duck(){if(!playing)return;if(prefs.duckMode==="pause"){pausedForSpeech=true;pause();}else{ducked=true;adjust();emit();}}
  function unduck(){if(pausedForSpeech){pausedForSpeech=false;if(prefs.enabled)play();}if(ducked){ducked=false;adjust();emit();}}
  function state(){return {enabled:prefs.enabled,playing,volume:prefs.volume,duckMode:prefs.duckMode,ducked:ducked||pausedForSpeech,hasTracks:true,track:currentTrack(),index:prefs.track,count:tracks.length,shuffle:!!prefs.shuffle,repeat:prefs.repeat||"all",error:lastError};}
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing)pause();});
  window.KMusic={
    init(saved,onSave){saveFn=onSave||saveFn;if(saved)Object.assign(prefs,saved);prefs.track=Number.isInteger(prefs.track)&&prefs.track>=0&&prefs.track<tracks.length?prefs.track:0;prefs.repeat=["all","one","off"].includes(prefs.repeat)?prefs.repeat:"all";prefs.shuffle=!!prefs.shuffle;emit();},
    play,pause,setEnabled,setVolume,setDuckMode,duck,unduck,
    next(){switchTrack(1);},prev(){switchTrack(-1);},setShuffle,setRepeat,toggle(){return playing?pause():setEnabled(true);},
    onChange(fn){listeners.push(fn);},get state(){return state();}
  };
})();
