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
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;
            
            // Create section gain nodes
            this.drumsGain = this.audioContext.createGain();
            this.drumsGain.connect(this.masterGain);
            this.drumsGain.gain.value = 0.75;
            
            this.synthsGain = this.audioContext.createGain();
            this.synthsGain.connect(this.masterGain);
            this.synthsGain.gain.value = 0.65;
            
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
        
        // Normalized gain for kick drum
        gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.connect(gain);
        gain.connect(this.drumsGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    generateSnareDrum() {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        
        // Create a more complex snare sound with both tonal and noise components
        
        // 1. Tonal component (pitched drum sound)
        const oscillator = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.05);
        
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        oscillator.connect(oscGain);
        
        // 2. Enhanced noise component with multiple frequency bands
        const bufferSize = this.sampleRate * 0.25;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        // High frequency noise (snare sizzle)
        const highFilter = this.audioContext.createBiquadFilter();
        highFilter.type = 'highpass';
        highFilter.frequency.value = 8000;
        highFilter.Q.value = 0.7;
        
        const highGain = this.audioContext.createGain();
        highGain.gain.setValueAtTime(0.3, now);
        highGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        // Mid frequency noise (snare body)
        const midFilter = this.audioContext.createBiquadFilter();
        midFilter.type = 'bandpass';
        midFilter.frequency.value = 2000;
        midFilter.Q.value = 2;
        
        const midGain = this.audioContext.createGain();
        midGain.gain.setValueAtTime(0.6, now);
        midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        // Create two noise paths
        const noiseSplitter = this.audioContext.createGain();
        noiseSplitter.gain.value = 1;
        
        noise.connect(noiseSplitter);
        noiseSplitter.connect(highFilter);
        noiseSplitter.connect(midFilter);
        
        highFilter.connect(highGain);
        midFilter.connect(midGain);
        
        // Main output gain with improved envelope
        const masterGain = this.audioContext.createGain();
        masterGain.gain.setValueAtTime(0.6, now); // Normalized volume
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        // Mix all components
        oscGain.connect(masterGain);
        highGain.connect(masterGain);
        midGain.connect(masterGain);
        masterGain.connect(this.drumsGain);
        
        // Start all sources
        oscillator.start();
        oscillator.stop(now + 0.15);
        noise.start();
        noise.stop(now + 0.25);
    }
    
    generateHiHat(open = false) {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        const duration = open ? 0.4 : 0.08;
        
        // Create more realistic hihat with multiple frequency bands
        const bufferSize = this.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate shaped noise with better characteristics
        for (let i = 0; i < bufferSize; i++) {
            // Add some metallic shimmer with frequency modulation
            const time = i / this.sampleRate;
            const envelope = Math.exp(-time * (open ? 3 : 12));
            const modulation = 1 + 0.3 * Math.sin(time * 12000 * Math.PI);
            data[i] = (Math.random() * 2 - 1) * envelope * modulation;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        // High frequency metallic content
        const highFilter = this.audioContext.createBiquadFilter();
        highFilter.type = 'highpass';
        highFilter.frequency.value = open ? 8000 : 10000;
        highFilter.Q.value = 0.5;
        
        // Band-pass for mid frequencies (adds body)
        const midFilter = this.audioContext.createBiquadFilter();
        midFilter.type = 'bandpass';
        midFilter.frequency.value = 6000;
        midFilter.Q.value = 2;
        
        // Additional high-shelf for sparkle
        const shelfFilter = this.audioContext.createBiquadFilter();
        shelfFilter.type = 'highshelf';
        shelfFilter.frequency.value = 12000;
        shelfFilter.gain.value = 3;
        
        // Create splitter for parallel processing
        const splitter = this.audioContext.createGain();
        const highGain = this.audioContext.createGain();
        const midGain = this.audioContext.createGain();
        
        highGain.gain.value = 0.7;
        midGain.gain.value = 0.3;
        
        // Main gain with improved envelope
        const masterGain = this.audioContext.createGain();
        const initialGain = open ? 0.6 : 0.4;
        masterGain.gain.setValueAtTime(initialGain, now);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Connect the processing chain
        noise.connect(splitter);
        splitter.connect(highFilter);
        splitter.connect(midFilter);
        
        highFilter.connect(shelfFilter);
        shelfFilter.connect(highGain);
        midFilter.connect(midGain);
        
        highGain.connect(masterGain);
        midGain.connect(masterGain);
        masterGain.connect(this.drumsGain);
        
        noise.start();
        noise.stop(now + duration);
    }
    
    generateCrash() {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        const duration = 1.5;
        
        // Create a more realistic crash with multiple frequency components
        const bufferSize = this.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate complex noise with metallic characteristics
        for (let i = 0; i < bufferSize; i++) {
            const time = i / this.sampleRate;
            
            // Complex envelope that decays but has some sustain
            const envelope = Math.exp(-time * 1.5) + 0.2 * Math.exp(-time * 0.5);
            
            // Add metallic shimmer and harmonic complexity
            const shimmer = 1 + 0.4 * Math.sin(time * 8000 * Math.PI) + 
                           0.2 * Math.sin(time * 15000 * Math.PI);
            
            data[i] = (Math.random() * 2 - 1) * envelope * shimmer;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        // Create multiple parallel frequency bands
        const splitter = this.audioContext.createGain();
        
        // High frequency band (bright sparkle)
        const highFilter = this.audioContext.createBiquadFilter();
        highFilter.type = 'highpass';
        highFilter.frequency.value = 8000;
        highFilter.Q.value = 0.7;
        
        const highShelf = this.audioContext.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 12000;
        highShelf.gain.value = 4;
        
        const highGain = this.audioContext.createGain();
        highGain.gain.value = 0.4;
        
        // Mid frequency band (body)
        const midFilter = this.audioContext.createBiquadFilter();
        midFilter.type = 'bandpass';
        midFilter.frequency.value = 4000;
        midFilter.Q.value = 1.5;
        
        const midGain = this.audioContext.createGain();
        midGain.gain.value = 0.5;
        
        // Low-mid frequency band (warmth)
        const lowMidFilter = this.audioContext.createBiquadFilter();
        lowMidFilter.type = 'bandpass';
        lowMidFilter.frequency.value = 1500;
        lowMidFilter.Q.value = 2;
        
        const lowMidGain = this.audioContext.createGain();
        lowMidGain.gain.value = 0.3;
        
        // Main gain with sophisticated envelope
        const masterGain = this.audioContext.createGain();
        masterGain.gain.setValueAtTime(0.9, now);
        masterGain.gain.exponentialRampToValueAtTime(0.3, now + 0.1);
        masterGain.gain.setValueAtTime(0.3, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Connect the processing chain
        noise.connect(splitter);
        
        splitter.connect(highFilter);
        splitter.connect(midFilter);
        splitter.connect(lowMidFilter);
        
        highFilter.connect(highShelf);
        highShelf.connect(highGain);
        midFilter.connect(midGain);
        lowMidFilter.connect(lowMidGain);
        
        highGain.connect(masterGain);
        midGain.connect(masterGain);
        lowMidGain.connect(masterGain);
        
        masterGain.connect(this.drumsGain);
        
        noise.start();
        noise.stop(now + duration);
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
                gain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.drumsGain);
                
                noise.start();
                noise.stop(this.audioContext.currentTime + 0.05);
            }, i * 10);
        }
    }
    
    // Synth sound generators
    generateSynth(frequency, waveform = 'sawtooth', duration = 0.5, attack = 0.01, decay = 0.3, sustain = 0.7, release = 0.5) {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        
        // Enhanced synth with multiple oscillators for richness
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        
        // Main oscillator
        oscillator1.frequency.value = frequency;
        oscillator1.type = waveform;
        
        // Sub oscillator for richness (octave down)
        oscillator2.frequency.value = frequency * 0.5;
        oscillator2.type = 'sine';
        
        // Balance between main and sub oscillators
        gain1.gain.value = 0.8;
        gain2.gain.value = 0.3;
        
        // Add filter for character
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 4;
        filter.Q.value = 1;
        
        // Main envelope gain
        const envelope = this.audioContext.createGain();
        
        // ADSR envelope
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(1, now + attack);
        envelope.gain.linearRampToValueAtTime(sustain, now + attack + decay);
        envelope.gain.setValueAtTime(sustain, now + duration - release);
        envelope.gain.linearRampToValueAtTime(0, now + duration);
        
        // Connect the chain
        oscillator1.connect(gain1);
        oscillator2.connect(gain2);
        gain1.connect(filter);
        gain2.connect(filter);
        filter.connect(envelope);
        envelope.connect(this.synthsGain);
        
        oscillator1.start();
        oscillator1.stop(now + duration);
        oscillator2.start();
        oscillator2.stop(now + duration);
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
                this.generateHiHat(false);
                break;
            case 'openhat':
                this.generateHiHat(true);
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
                this.generateEnhancedBass(frequency * 0.5);
                break;
            case 'lead':
                this.generateEnhancedLead(frequency);
                break;
            case 'pad':
                this.generateEnhancedPad(frequency);
                break;
            case 'arp':
                this.generateSynth(frequency, 'triangle', 0.2, 0.01, 0.1, 0.3, 0.2);
                break;
        }
    }
    
    generateEnhancedBass(frequency) {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        const duration = 0.6;
        
        // Multiple oscillators for thick bass sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        
        // Main bass oscillator
        osc1.type = 'sawtooth';
        osc1.frequency.value = frequency;
        gain1.gain.value = 0.6;
        
        // Sub-bass oscillator (octave down)
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 0.5;
        gain2.gain.value = 0.4;
        
        // Higher harmonic for presence
        osc3.type = 'square';
        osc3.frequency.value = frequency * 2;
        gain3.gain.value = 0.1;
        
        // Filter for character and punch
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 6, now);
        filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.1);
        filter.Q.value = 2;
        
        // Envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(1, now + 0.01);
        envelope.gain.linearRampToValueAtTime(0.7, now + 0.1);
        envelope.gain.setValueAtTime(0.7, now + duration - 0.3);
        envelope.gain.linearRampToValueAtTime(0, now + duration);
        
        // Connect chain
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);
        filter.connect(envelope);
        envelope.connect(this.synthsGain);
        
        // Start and stop
        [osc1, osc2, osc3].forEach(osc => {
            osc.start();
            osc.stop(now + duration);
        });
    }
    
    generateEnhancedLead(frequency) {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        const duration = 0.4;
        
        // Bright lead sound with modulation
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const lfo = this.audioContext.createOscillator();
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const lfoGain = this.audioContext.createGain();
        
        // Main lead oscillator
        osc1.type = 'square';
        osc1.frequency.value = frequency;
        gain1.gain.value = 0.7;
        
        // Detuned oscillator for richness
        osc2.type = 'sawtooth';
        osc2.frequency.value = frequency * 1.007; // Slight detune
        gain2.gain.value = 0.3;
        
        // LFO for vibrato
        lfo.type = 'sine';
        lfo.frequency.value = 5;
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        
        // Bright filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 8, now);
        filter.frequency.exponentialRampToValueAtTime(frequency * 4, now + 0.2);
        filter.Q.value = 3;
        
        // Snappy envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(1, now + 0.02);
        envelope.gain.linearRampToValueAtTime(0.5, now + 0.1);
        envelope.gain.setValueAtTime(0.5, now + duration - 0.2);
        envelope.gain.linearRampToValueAtTime(0, now + duration);
        
        // Connect chain
        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(filter);
        gain2.connect(filter);
        filter.connect(envelope);
        envelope.connect(this.synthsGain);
        
        // Start and stop
        [osc1, osc2, lfo].forEach(osc => {
            osc.start();
            osc.stop(now + duration);
        });
    }
    
    generateEnhancedPad(frequency) {
        this.ensureAudioContext();
        
        const now = this.audioContext.currentTime;
        const duration = 1.2;
        
        // Rich pad sound with multiple detuned oscillators
        const oscillators = [];
        const gains = [];
        
        // Create 4 slightly detuned oscillators for richness
        const detunes = [0, 0.003, -0.005, 0.007];
        const waveforms = ['sine', 'triangle', 'sine', 'triangle'];
        
        for (let i = 0; i < 4; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = waveforms[i];
            osc.frequency.value = frequency * (1 + detunes[i]);
            gain.gain.value = 0.25;
            
            oscillators.push(osc);
            gains.push(gain);
        }
        
        // Warm filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 3;
        filter.Q.value = 0.5;
        
        // Slow attack envelope for pad character
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.8, now + 0.3);
        envelope.gain.setValueAtTime(0.8, now + duration - 0.5);
        envelope.gain.linearRampToValueAtTime(0, now + duration);
        
        // Connect all oscillators
        for (let i = 0; i < 4; i++) {
            oscillators[i].connect(gains[i]);
            gains[i].connect(filter);
        }
        filter.connect(envelope);
        envelope.connect(this.synthsGain);
        
        // Start and stop all oscillators
        oscillators.forEach(osc => {
            osc.start();
            osc.stop(now + duration);
        });
    }
}

// Export for use in other modules
window.AudioEngine = AudioEngine;