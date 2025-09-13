/**
 * Audio Engine - Web Audio API implementation for sound generation
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.drumsGain = null;
        this.synthsGain = null;
        this.isInitialized = false;
        this.sampleRate = 44100;
        this.instrumentGains = { drums: {}, synths: {} };
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        
        this.initializeAudio();
    }
    
    async initializeAudio() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.8;

            // Add a gentle master compressor to tame peaks
            this.masterCompressor = this.audioContext.createDynamicsCompressor();
            this.masterCompressor.threshold.setValueAtTime(-12, this.audioContext.currentTime);
            this.masterCompressor.knee.setValueAtTime(3, this.audioContext.currentTime);
            this.masterCompressor.ratio.setValueAtTime(4, this.audioContext.currentTime);
            this.masterCompressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            this.masterCompressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

            // Connect master chain
            this.masterGain.connect(this.masterCompressor);
            this.masterCompressor.connect(this.audioContext.destination);
            
            // Create section gain nodes
            this.drumsGain = this.audioContext.createGain();
            this.drumsGain.connect(this.masterGain);
            this.drumsGain.gain.value = 0.8;
            
            this.synthsGain = this.audioContext.createGain();
            this.synthsGain.connect(this.masterGain);
            this.synthsGain.gain.value = 0.8;

            // Per-instrument gain nodes for individual volume control
            const drumNames = ['kick', 'snare', 'hihat', 'openhat', 'crash', 'clap'];
            drumNames.forEach(name => {
                const g = this.audioContext.createGain();
                g.gain.value = 0.8; // default per-instrument level
                g.connect(this.drumsGain);
                this.instrumentGains.drums[name] = g;
            });

            const synthNames = ['bass', 'lead', 'pad', 'arp'];
            synthNames.forEach(name => {
                const g = this.audioContext.createGain();
                g.gain.value = 0.8; // default per-instrument level
                g.connect(this.synthsGain);
                this.instrumentGains.synths[name] = g;
            });
            
            // Initialize effects
            this.initializeEffects();
            
            this.isInitialized = true;
            console.log('Audio engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
        }
    }
    
    initializeEffects() {
        // Reverb using convolver
        this.reverb = this.audioContext.createConvolver();
        this.createReverbImpulseResponse();
        
        // Delay
        this.delay = this.audioContext.createDelay(1.0);
        this.delay.delayTime.value = 0.3;
        
        const delayFeedback = this.audioContext.createGain();
        delayFeedback.gain.value = 0.3;
        
        this.delay.connect(delayFeedback);
        delayFeedback.connect(this.delay);
        
        // Filter
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 22050;
        this.filter.Q.value = 1;
    }
    
    createReverbImpulseResponse() {
        const length = this.sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, this.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        
        this.reverb.buffer = impulse;
    }
    
    ensureAudioContext() {
        if (!this.isInitialized || this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    // Drum sound generators
    generateKickDrum() {
        this.ensureAudioContext();
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + 0.5);
        
        // Slightly reduce initial gain to balance with other drums
        gain.gain.setValueAtTime(0.7, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.connect(gain);
        // Route through per-instrument gain
        gain.connect(this.instrumentGains.drums['kick'] || this.drumsGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    generateSnareDrum() {
        this.ensureAudioContext();
        
        // Noise component
        const bufferSize = this.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        gain.connect(this.instrumentGains.drums['snare'] || this.drumsGain);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + 0.3);
    }
    
    generateHiHat(open = false, key = 'hihat') {
        this.ensureAudioContext();
        
        const bufferSize = this.sampleRate * (open ? 0.3 : 0.1);
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + (open ? 0.3 : 0.1));
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.instrumentGains.drums[key] || this.drumsGain);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + (open ? 0.3 : 0.1));
    }
    
    generateCrash() {
        this.ensureAudioContext();
        
        const bufferSize = this.sampleRate * 1.0;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 5000;
        filter.Q.value = 0.5;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.0);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.instrumentGains.drums['crash'] || this.drumsGain);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + 1.0);
    }
    
    generateClap() {
        this.ensureAudioContext();
        
        // Multiple short bursts for clap effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const bufferSize = this.sampleRate * 0.05;
                const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let j = 0; j < bufferSize; j++) {
                    data[j] = Math.random() * 2 - 1;
                }
                
                const noise = this.audioContext.createBufferSource();
                noise.buffer = buffer;
                
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1000;
                filter.Q.value = 2;
                
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0.45, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.instrumentGains.drums['clap'] || this.drumsGain);
                
                noise.start();
                noise.stop(this.audioContext.currentTime + 0.05);
            }, i * 10);
        }
    }
    
    // Synth sound generators
    generateSynth(frequency, waveform = 'sawtooth', duration = 0.5, attack = 0.01, decay = 0.3, sustain = 0.7, release = 0.5, level = 0.5, key = 'lead') {
        this.ensureAudioContext();
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.frequency.value = frequency;
        oscillator.type = waveform;
        
        // ADSR envelope
        const now = this.audioContext.currentTime;
        const peak = Math.max(0, Math.min(1, level));
        const sus = Math.max(0, Math.min(1, sustain)) * peak;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(peak, now + attack);
        gain.gain.linearRampToValueAtTime(sus, now + attack + decay);
        gain.gain.setValueAtTime(sus, now + duration - release);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator.connect(gain);
        // Route through per-instrument gain
        const target = this.instrumentGains.synths[key] || this.synthsGain;
        gain.connect(target);
        
        oscillator.start();
        oscillator.stop(now + duration);
    }
    
    // Volume controls
    setMasterVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
    }
    
    setDrumsVolume(value) {
        if (this.drumsGain) {
            this.drumsGain.gain.value = value;
        }
    }
    
    setSynthsVolume(value) {
        if (this.synthsGain) {
            this.synthsGain.gain.value = value;
        }
    }
    
    // Effect controls
    setReverbLevel(value) {
        // Implementation would connect/disconnect reverb based on level
        console.log('Reverb level:', value);
    }
    
    setDelayLevel(value) {
        // Implementation would adjust delay mix
        console.log('Delay level:', value);
    }
    
    setFilterLevel(value) {
        if (this.filter) {
            // Map 0-1 to frequency range
            const minFreq = 200;
            const maxFreq = 22050;
            const frequency = minFreq + (value * (maxFreq - minFreq));
            this.filter.frequency.value = frequency;
        }
    }
    
    // Play drum sound by name
    playDrumSound(soundName) {
        switch (soundName) {
            case 'kick':
                this.generateKickDrum();
                break;
            case 'snare':
                this.generateSnareDrum();
                break;
            case 'hihat':
                this.generateHiHat(false, 'hihat');
                break;
            case 'openhat':
                this.generateHiHat(true, 'openhat');
                break;
            case 'crash':
                this.generateCrash();
                break;
            case 'clap':
                this.generateClap();
                break;
        }
    }
    
    // Play synth sound by name
    playSynthSound(soundName, frequency = 440) {
        switch (soundName) {
            case 'bass':
                this.generateSynth(frequency * 0.5, 'sawtooth', 0.5, 0.01, 0.3, 0.6, 0.4, 0.45, 'bass');
                break;
            case 'lead':
                this.generateSynth(frequency, 'square', 0.3, 0.02, 0.15, 0.5, 0.2, 0.35, 'lead');
                break;
            case 'pad':
                this.generateSynth(frequency, 'sine', 1.2, 0.4, 0.4, 0.8, 0.8, 0.4, 'pad');
                break;
            case 'arp':
                this.generateSynth(frequency, 'triangle', 0.18, 0.01, 0.08, 0.3, 0.15, 0.3, 'arp');
                break;
        }
    }

    // Per-instrument volume control
    setInstrumentVolume(section, name, value) {
        const group = this.instrumentGains[section];
        if (group && group[name]) {
            group[name].gain.value = value;
        }
    }
}

// Export for use in other modules
window.AudioEngine = AudioEngine;
