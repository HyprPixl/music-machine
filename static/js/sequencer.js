/**
 * Sequencer Logic - Main sequencer functionality
 */

class Sequencer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.isPlaying = false;
        this.currentStep = 0;
        this.bpm = 120;
        this.steps = 16;
        this.stepInterval = null;
        this.currentSequenceId = null;
        
        // Sequence data structure
        this.sequence = {
            name: 'Untitled Sequence',
            bpm: 120,
            steps: 16,
            tracks: {
                drums: {
                    kick: new Array(16).fill(false),
                    snare: new Array(16).fill(false),
                    hihat: new Array(16).fill(false),
                    openhat: new Array(16).fill(false),
                    crash: new Array(16).fill(false),
                    clap: new Array(16).fill(false)
                },
                synths: {
                    bass: new Array(16).fill(false),
                    lead: new Array(16).fill(false),
                    pad: new Array(16).fill(false),
                    arp: new Array(16).fill(false)
                }
            },
            volume: {
                master: 0.8,
                drums: 0.8,
                synths: 0.8,
                perInstrument: {
                    drums: { kick: 0.8, snare: 0.8, hihat: 0.7, openhat: 0.7, crash: 0.6, clap: 0.7 },
                    synths: { bass: 0.7, lead: 0.6, pad: 0.6, arp: 0.5 }
                }
            },
            effects: {
                reverb: 0.2,
                delay: 0.1,
                filter: 0.0
            },
            removed: {
                drums: { kick: false, snare: false, hihat: false, openhat: false, crash: false, clap: false },
                synths: { bass: false, lead: false, pad: false, arp: false }
            }
        };
        
        this.initializeSequencer();
    }
    
    initializeSequencer() {
        this.renderStepIndicators();
        this.renderTracks();
        this.bindEvents();
        this.updateStepInterval();
        // Apply initial mixer/effects values from UI so audio matches the visible state
        const master = parseFloat(document.getElementById('master-volume').value || '0.8');
        const drums = parseFloat(document.getElementById('drums-volume').value || '0.8');
        const synths = parseFloat(document.getElementById('synths-volume').value || '0.8');
        const reverb = parseFloat(document.getElementById('reverb-level').value || '0.2');
        const delay = parseFloat(document.getElementById('delay-level').value || '0.1');
        const filter = parseFloat(document.getElementById('filter-level').value || '0.0');

        this.audioEngine.setMasterVolume(master);
        this.audioEngine.setDrumsVolume(drums);
        this.audioEngine.setSynthsVolume(synths);
        this.audioEngine.setReverbLevel(reverb);
        this.audioEngine.setDelayLevel(delay);
        this.audioEngine.setFilterLevel(filter);

        this.updateVolumeDisplay('master', master);
        this.updateVolumeDisplay('drums', drums);
        this.updateVolumeDisplay('synths', synths);
        this.updateEffectDisplay('reverb', reverb);
        this.updateEffectDisplay('delay', delay);
        this.updateEffectDisplay('filter', filter);
    }
    
    renderStepIndicators() {
        const container = document.getElementById('step-indicators');
        container.innerHTML = '';
        
        for (let i = 0; i < this.steps; i++) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-number';
            stepDiv.textContent = (i + 1).toString().padStart(2, '0');
            stepDiv.dataset.step = i;
            container.appendChild(stepDiv);
        }
    }
    
    renderTracks() {
        this.renderDrumTracks();
        this.renderSynthTracks();
    }
    
    renderDrumTracks() {
        const container = document.getElementById('drum-tracks');
        container.innerHTML = '';
        
        const drumSounds = Object.keys(this.sequence.tracks.drums);
        // Active first, then removed
        drumSounds.sort((a,b) => (this.sequence.removed.drums[a] === this.sequence.removed.drums[b]) ? 0 : (this.sequence.removed.drums[a] ? 1 : -1));
        
        drumSounds.forEach(soundName => {
            const trackRow = document.createElement('div');
            trackRow.className = 'track-row';
            if (this.sequence.removed.drums[soundName]) trackRow.classList.add('removed');
            
            // Track label
            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = soundName.toUpperCase();
            label.dataset.instrument = 'drums';
            label.dataset.sound = soundName;
            label.title = 'Click to remove/restore this instrument';
            label.addEventListener('click', () => {
                this.toggleInstrumentRemoved('drums', soundName);
                // Move row to end if removed; or re-render to reorder
                this.renderDrumTracks();
            });
            trackRow.appendChild(label);

            // Per-instrument volume knob
            const controls = document.createElement('div');
            controls.className = 'track-controls';
            const knob = document.createElement('input');
            knob.type = 'range';
            knob.min = '0';
            knob.max = '1';
            knob.step = '0.01';
            knob.value = this.sequence.volume.perInstrument.drums[soundName];
            knob.className = 'knob';
            knob.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                this.setInstrumentVolume('drums', soundName, v);
            });
            const knobVal = document.createElement('span');
            knobVal.className = 'knob-value';
            knobVal.textContent = Math.round(this.sequence.volume.perInstrument.drums[soundName] * 100);
            knob.addEventListener('input', () => knobVal.textContent = Math.round(knob.value * 100));
            controls.appendChild(knob);
            controls.appendChild(knobVal);
            trackRow.appendChild(controls);
            
            // Step buttons
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'step-buttons';
            
            for (let i = 0; i < this.steps; i++) {
                const stepBtn = document.createElement('button');
                stepBtn.className = 'step-btn';
                stepBtn.dataset.instrument = 'drums';
                stepBtn.dataset.sound = soundName;
                stepBtn.dataset.step = i;
                
                if (this.sequence.tracks.drums[soundName][i]) {
                    stepBtn.classList.add('active');
                }
                
                stepBtn.addEventListener('click', () => {
                    this.toggleStep('drums', soundName, i);
                });
                
                stepsContainer.appendChild(stepBtn);
            }
            
            trackRow.appendChild(stepsContainer);
            container.appendChild(trackRow);
        });
    }
    
    renderSynthTracks() {
        const container = document.getElementById('synth-tracks');
        container.innerHTML = '';
        
        const synthSounds = Object.keys(this.sequence.tracks.synths);
        synthSounds.sort((a,b) => (this.sequence.removed.synths[a] === this.sequence.removed.synths[b]) ? 0 : (this.sequence.removed.synths[a] ? 1 : -1));
        
        synthSounds.forEach(soundName => {
            const trackRow = document.createElement('div');
            trackRow.className = 'track-row';
            if (this.sequence.removed.synths[soundName]) trackRow.classList.add('removed');
            
            // Track label
            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = soundName.toUpperCase();
            label.dataset.instrument = 'synths';
            label.dataset.sound = soundName;
            label.title = 'Click to remove/restore this instrument';
            label.addEventListener('click', () => {
                this.toggleInstrumentRemoved('synths', soundName);
                this.renderSynthTracks();
            });
            trackRow.appendChild(label);

            // Per-instrument volume knob
            const controls = document.createElement('div');
            controls.className = 'track-controls';
            const knob = document.createElement('input');
            knob.type = 'range';
            knob.min = '0';
            knob.max = '1';
            knob.step = '0.01';
            knob.value = this.sequence.volume.perInstrument.synths[soundName];
            knob.className = 'knob';
            knob.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                this.setInstrumentVolume('synths', soundName, v);
            });
            const knobVal = document.createElement('span');
            knobVal.className = 'knob-value';
            knobVal.textContent = Math.round(this.sequence.volume.perInstrument.synths[soundName] * 100);
            knob.addEventListener('input', () => knobVal.textContent = Math.round(knob.value * 100));
            controls.appendChild(knob);
            controls.appendChild(knobVal);
            trackRow.appendChild(controls);
            
            // Step buttons
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'step-buttons';
            
            for (let i = 0; i < this.steps; i++) {
                const stepBtn = document.createElement('button');
                stepBtn.className = 'step-btn';
                stepBtn.dataset.instrument = 'synths';
                stepBtn.dataset.sound = soundName;
                stepBtn.dataset.step = i;
                
                if (this.sequence.tracks.synths[soundName][i]) {
                    stepBtn.classList.add('active');
                }
                
                stepBtn.addEventListener('click', () => {
                    this.toggleStep('synths', soundName, i);
                });
                
                stepsContainer.appendChild(stepBtn);
            }
            
            trackRow.appendChild(stepsContainer);
            container.appendChild(trackRow);
        });
    }
    
    bindEvents() {
        // Transport controls
        document.getElementById('play-btn').addEventListener('click', () => {
            this.isPlaying ? this.stop() : this.play();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stop();
        });
        
        // BPM control
        document.getElementById('bpm-input').addEventListener('change', (e) => {
            this.setBpm(parseInt(e.target.value));
        });
        
        // Volume controls
        document.getElementById('master-volume').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.audioEngine.setMasterVolume(value);
            this.sequence.volume.master = value;
            this.updateVolumeDisplay('master', value);
        });
        
        document.getElementById('drums-volume').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.audioEngine.setDrumsVolume(value);
            this.sequence.volume.drums = value;
            this.updateVolumeDisplay('drums', value);
        });
        
        document.getElementById('synths-volume').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.audioEngine.setSynthsVolume(value);
            this.sequence.volume.synths = value;
            this.updateVolumeDisplay('synths', value);
        });
        
        // Effect controls
        document.getElementById('reverb-level').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.audioEngine.setReverbLevel(value);
            this.sequence.effects.reverb = value;
            this.updateEffectDisplay('reverb', value);
        });
        
        document.getElementById('delay-level').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.audioEngine.setDelayLevel(value);
            this.sequence.effects.delay = value;
            this.updateEffectDisplay('delay', value);
        });
        
        document.getElementById('filter-level').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.audioEngine.setFilterLevel(value);
            this.sequence.effects.filter = value;
            this.updateEffectDisplay('filter', value);
        });
    }

    toggleInstrumentRemoved(section, sound) {
        const current = this.sequence.removed[section][sound];
        this.sequence.removed[section][sound] = !current;
    }

    setInstrumentVolume(section, sound, value) {
        // Update sequence state
        this.sequence.volume.perInstrument[section][sound] = value;
        // Apply to audio engine
        this.audioEngine.setInstrumentVolume(section, sound, value);
    }
    
    toggleStep(instrument, sound, step) {
        const currentState = this.sequence.tracks[instrument][sound][step];
        this.sequence.tracks[instrument][sound][step] = !currentState;
        
        // Update UI
        const stepBtn = document.querySelector(
            `[data-instrument="${instrument}"][data-sound="${sound}"][data-step="${step}"]`
        );
        
        if (stepBtn) {
            stepBtn.classList.toggle('active', !currentState);
        }
        
        // Play sound for immediate feedback
        if (!currentState) {
            if (instrument === 'drums') {
                this.audioEngine.playDrumSound(sound);
            } else {
                this.audioEngine.playSynthSound(sound, 440);
            }
        }
    }
    
    play() {
        this.isPlaying = true;
        document.getElementById('play-btn').classList.add('active');
        document.getElementById('play-btn').textContent = '⏸';
        // Ensure audio context resumes inside this user gesture
        this.audioEngine.ensureAudioContext();
        
        this.stepInterval = setInterval(() => {
            this.playStep();
            this.currentStep = (this.currentStep + 1) % this.steps;
            this.updateStepIndicator();
        }, this.getStepDuration());
    }
    
    stop() {
        this.isPlaying = false;
        document.getElementById('play-btn').classList.remove('active');
        document.getElementById('play-btn').textContent = '▶';
        
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }
        
        this.currentStep = 0;
        this.updateStepIndicator();
        this.clearPlayingSteps();
    }
    
    playStep() {
        const step = this.currentStep;
        
        // Clear previous playing indicators
        this.clearPlayingSteps();
        
        // Play drum sounds (skip removed)
        Object.keys(this.sequence.tracks.drums).forEach(soundName => {
            if (!this.sequence.removed.drums[soundName] && this.sequence.tracks.drums[soundName][step]) {
                this.audioEngine.playDrumSound(soundName);
                this.highlightPlayingStep('drums', soundName, step);
            }
        });
        
        // Play synth sounds (skip removed)
        Object.keys(this.sequence.tracks.synths).forEach(soundName => {
            if (!this.sequence.removed.synths[soundName] && this.sequence.tracks.synths[soundName][step]) {
                this.audioEngine.playSynthSound(soundName, 440);
                this.highlightPlayingStep('synths', soundName, step);
            }
        });
    }
    
    highlightPlayingStep(instrument, sound, step) {
        const stepBtn = document.querySelector(
            `[data-instrument="${instrument}"][data-sound="${sound}"][data-step="${step}"]`
        );
        if (stepBtn && stepBtn.classList.contains('active')) {
            stepBtn.classList.add('playing');
        }
    }
    
    clearPlayingSteps() {
        document.querySelectorAll('.step-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
        });
    }
    
    updateStepIndicator() {
        document.querySelectorAll('.step-number').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentStep);
        });
    }
    
    setBpm(bpm) {
        this.bpm = Math.max(60, Math.min(200, bpm));
        this.sequence.bpm = this.bpm;
        document.getElementById('bpm-input').value = this.bpm;
        
        if (this.isPlaying) {
            this.updateStepInterval();
        }
    }
    
    updateStepInterval() {
        if (this.stepInterval && this.isPlaying) {
            clearInterval(this.stepInterval);
            this.stepInterval = setInterval(() => {
                this.playStep();
                this.currentStep = (this.currentStep + 1) % this.steps;
                this.updateStepIndicator();
            }, this.getStepDuration());
        }
    }
    
    getStepDuration() {
        // 16th notes at given BPM
        return (60 / this.bpm / 4) * 1000;
    }
    
    updateVolumeDisplay(type, value) {
        const display = document.querySelector(`#${type}-volume`).parentNode.querySelector('.volume-value');
        if (display) {
            display.textContent = Math.round(value * 100);
        }
    }
    
    updateEffectDisplay(type, value) {
        const display = document.querySelector(`#${type}-level`).parentNode.querySelector('.effect-value');
        if (display) {
            display.textContent = Math.round(value * 100);
        }
    }
    
    clearSequence() {
        // Reset all steps to false
        Object.keys(this.sequence.tracks.drums).forEach(soundName => {
            this.sequence.tracks.drums[soundName].fill(false);
        });
        
        Object.keys(this.sequence.tracks.synths).forEach(soundName => {
            this.sequence.tracks.synths[soundName].fill(false);
        });
        
        // Update UI
        document.querySelectorAll('.step-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    loadSequence(sequenceData) {
        if (!sequenceData) return;
        
        this.sequence = { ...this.sequence, ...sequenceData };
        this.currentSequenceId = sequenceData.id;
        this.setBpm(this.sequence.bpm);
        
        // Update volume controls
        document.getElementById('master-volume').value = this.sequence.volume.master;
        document.getElementById('drums-volume').value = this.sequence.volume.drums;
        document.getElementById('synths-volume').value = this.sequence.volume.synths;
        
        // Update effect controls
        document.getElementById('reverb-level').value = this.sequence.effects.reverb;
        document.getElementById('delay-level').value = this.sequence.effects.delay;
        document.getElementById('filter-level').value = this.sequence.effects.filter;
        
        // Update displays
        this.updateVolumeDisplay('master', this.sequence.volume.master);
        this.updateVolumeDisplay('drums', this.sequence.volume.drums);
        this.updateVolumeDisplay('synths', this.sequence.volume.synths);
        this.updateEffectDisplay('reverb', this.sequence.effects.reverb);
        this.updateEffectDisplay('delay', this.sequence.effects.delay);
        this.updateEffectDisplay('filter', this.sequence.effects.filter);
        
        // Apply audio engine settings
        this.audioEngine.setMasterVolume(this.sequence.volume.master);
        this.audioEngine.setDrumsVolume(this.sequence.volume.drums);
        this.audioEngine.setSynthsVolume(this.sequence.volume.synths);
        this.audioEngine.setReverbLevel(this.sequence.effects.reverb);
        this.audioEngine.setDelayLevel(this.sequence.effects.delay);
        this.audioEngine.setFilterLevel(this.sequence.effects.filter);
        
        // Re-render tracks with new data
        this.renderTracks();
    }
    
    getSequenceData() {
        return {
            ...this.sequence,
            id: this.currentSequenceId
        };
    }
}

// Export for use in other modules
window.Sequencer = Sequencer;
