/**
 * Sequencer Logic - Main sequencer functionality
 */

class Sequencer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.isPlaying = false;
        this.currentStep = 0;
        this.bpm = 120;
        this.timeSignature = { num: 4, den: 4 }; // global time signature
        this.steps = 16; // steps = stepsPerBar * bars
        this.stepInterval = null;
        this.currentSequenceId = null;
        // Internal note state for synth steps (MIDI numbers). Not persisted yet.
        this.synthNotes = {
            bass: new Array(16).fill(69),  // A4
            lead: new Array(16).fill(69),
            pad: new Array(16).fill(69),
            arp: new Array(16).fill(69)
        };
        // Drag state for adjusting synth notes
        this._dragState = null;
        // Pattern management
        this.patterns = {
            active: 1,
            pending: null,
            store: {}
        };
        
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

    // Bind left-drag on label to set per-instrument volume with fill
    bindLabelVolumeDrag(labelEl, section, soundName) {
        const fill = labelEl.querySelector('.volume-fill');
        const onMove = (ev) => {
            const rect = labelEl.getBoundingClientRect();
            const ratio = (ev.clientX - rect.left) / rect.width;
            const v = Math.max(0, Math.min(1, ratio));
            this.setInstrumentVolume(section, soundName, v);
            if (fill) fill.style.width = `${Math.round(v * 100)}%`;
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.userSelect = '';
        };
        labelEl.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // left only
            e.preventDefault();
            document.body.style.userSelect = 'none';
            onMove(e);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    }

    // ---- Note helpers ----
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    midiToName(midi) {
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return names[((midi % 12) + 12) % 12];
    }

    noteColorForMidi(midi) {
        const hue = (((midi % 12) + 12) % 12) * 30; // 0..330 by semitone
        return `hsl(${hue}, 90%, 50%)`;
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

        // Apply per-instrument volumes
        Object.entries(this.sequence.volume.perInstrument.drums).forEach(([name, v]) => {
            this.audioEngine.setInstrumentVolume('drums', name, v);
        });
        Object.entries(this.sequence.volume.perInstrument.synths).forEach(([name, v]) => {
            this.audioEngine.setInstrumentVolume('synths', name, v);
        });

        // Initialize patterns store from current state (4 slots)
        for (let i = 1; i <= 4; i++) {
            this.patterns.store[i] = this.createEmptyPattern();
        }
        this.saveCurrentPattern();
        this.updatePatternButtons();
        this.updateBarsDisplay();
    }
    
    renderStepIndicators() {
        const container = document.getElementById('step-indicators');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${this.steps}, 1fr)`;
        
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
            const volFill = document.createElement('div');
            volFill.className = 'volume-fill';
            const labelText = document.createElement('span');
            labelText.className = 'label-text';
            labelText.textContent = soundName.toUpperCase();
            label.appendChild(volFill);
            label.appendChild(labelText);
            label.dataset.instrument = 'drums';
            label.dataset.sound = soundName;
            label.title = 'Drag to set volume · Right-click to deactivate/restore';
            const vol = this.sequence.volume.perInstrument?.drums?.[soundName] ?? 0.8;
            volFill.style.width = `${Math.round(vol * 100)}%`;
            this.bindLabelVolumeDrag(label, 'drums', soundName);
            label.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.toggleInstrumentRemoved('drums', soundName);
                this.renderDrumTracks();
            });
            trackRow.appendChild(label);

            
            // Step buttons
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'step-buttons';
            stepsContainer.style.gridTemplateColumns = `repeat(${this.steps}, 1fr)`;
            
            for (let i = 0; i < this.steps; i++) {
                const stepBtn = document.createElement('button');
                stepBtn.className = 'step-btn';
                stepBtn.dataset.instrument = 'drums';
                stepBtn.dataset.sound = soundName;
                stepBtn.dataset.step = i;
                
                if (this.sequence.tracks.drums[soundName][i]) {
                    stepBtn.classList.add('active');
                }
                
                // Left-click: activate cell (no toggle-off)
                stepBtn.addEventListener('click', () => {
                    if (stepBtn._suppressClickNext) { stepBtn._suppressClickNext = false; return; }
                    this.setStep('drums', soundName, i, true);
                });
                // Right-click: deactivate cell
                stepBtn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.setStep('drums', soundName, i, false);
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
        
        // Ensure note arrays exist and match steps
        synthSounds.forEach(name => {
            if (!this.synthNotes[name] || this.synthNotes[name].length !== this.steps) {
                this.synthNotes[name] = new Array(this.steps).fill(69);
            }
        });

        synthSounds.forEach(soundName => {
            const trackRow = document.createElement('div');
            trackRow.className = 'track-row';
            if (this.sequence.removed.synths[soundName]) trackRow.classList.add('removed');
            
            // Track label
            const label = document.createElement('div');
            label.className = 'track-label';
            const volFill = document.createElement('div');
            volFill.className = 'volume-fill';
            const labelText = document.createElement('span');
            labelText.className = 'label-text';
            labelText.textContent = soundName.toUpperCase();
            label.appendChild(volFill);
            label.appendChild(labelText);
            label.dataset.instrument = 'synths';
            label.dataset.sound = soundName;
            label.title = 'Drag to set volume · Right-click to deactivate/restore';
            const vol = this.sequence.volume.perInstrument?.synths?.[soundName] ?? 0.7;
            volFill.style.width = `${Math.round(vol * 100)}%`;
            this.bindLabelVolumeDrag(label, 'synths', soundName);
            label.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.toggleInstrumentRemoved('synths', soundName);
                this.renderSynthTracks();
            });
            trackRow.appendChild(label);

            
            // Step buttons
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'step-buttons';
            stepsContainer.style.gridTemplateColumns = `repeat(${this.steps}, 1fr)`;
            
            for (let i = 0; i < this.steps; i++) {
                const stepBtn = document.createElement('button');
                stepBtn.className = 'step-btn';
                stepBtn.dataset.instrument = 'synths';
                stepBtn.dataset.sound = soundName;
                stepBtn.dataset.step = i;
                
                if (this.sequence.tracks.synths[soundName][i]) {
                    stepBtn.classList.add('active');
                    // Show current note label and color when active
                    const midi = this.synthNotes[soundName][i] ?? 69;
                    stepBtn.textContent = this.midiToName(midi);
                    stepBtn.style.borderColor = this.noteColorForMidi(midi);
                }
                
                // Left-click: activate cell (no toggle-off)
                stepBtn.addEventListener('click', () => {
                    if (stepBtn._suppressClickNext) { stepBtn._suppressClickNext = false; return; }
                    this.setStep('synths', soundName, i, true);
                });
                // Right-click: deactivate cell
                stepBtn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.setStep('synths', soundName, i, false);
                });

                // Drag up/down to change note
                stepBtn.addEventListener('mousedown', (e) => {
                    const startMidi = this.synthNotes[soundName][i] ?? 69;
                    this._dragState = {
                        sound: soundName,
                        step: i,
                        startY: e.clientY,
                        startMidi,
                        moved: false,
                        activatedOnDrag: false,
                        btn: stepBtn
                    };
                    const onMove = (ev) => {
                        if (!this._dragState) return;
                        const dy = this._dragState.startY - ev.clientY;
                        const semis = Math.round(dy / 8); // 8px per semitone
                        let midi = this._dragState.startMidi + semis;
                        midi = Math.max(48, Math.min(84, midi)); // clamp 4 octaves
                        // If we start dragging and the step isn't active, activate it now
                        if (!this._dragState.activatedOnDrag && !this.sequence.tracks.synths[this._dragState.sound][this._dragState.step]) {
                            this.setStep('synths', this._dragState.sound, this._dragState.step, true);
                            this._dragState.activatedOnDrag = true;
                        }
                        if (midi !== this.synthNotes[this._dragState.sound][this._dragState.step]) {
                            this._dragState.moved = true;
                            this.synthNotes[this._dragState.sound][this._dragState.step] = midi;
                            // Update UI label/color
                            this._dragState.btn.textContent = this.midiToName(midi);
                            this._dragState.btn.style.borderColor = this.noteColorForMidi(midi);
                            // Optional: preview note while dragging
                            this.audioEngine.playSynthSound(this._dragState.sound, this.midiToFreq(midi));
                        }
                    };
                    const onUp = (ev) => {
                        if (this._dragState && this._dragState.moved) {
                            // Prevent click after drag
                            ev.preventDefault();
                            ev.stopPropagation();
                            stepBtn._suppressClickNext = true;
                        }
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                        this._dragState = null;
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
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

        // Bars controls
        const minus = document.getElementById('bars-minus');
        const plus = document.getElementById('bars-plus');
        if (minus && plus) {
            minus.addEventListener('click', () => this.addBars(-1));
            plus.addEventListener('click', () => this.addBars(1));
        }
        // Time signature controls
        const tsNum = document.getElementById('timesig-num');
        const tsDen = document.getElementById('timesig-den');
        if (tsNum && tsDen) {
            const onTsChange = () => {
                this.timeSignature.num = parseInt(tsNum.value);
                this.timeSignature.den = parseInt(tsDen.value);
                this.applyTimeSignature();
            };
            tsNum.addEventListener('change', onTsChange);
            tsDen.addEventListener('change', onTsChange);
        }
        // Pattern buttons
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = parseInt(btn.dataset.pattern);
                this.requestPattern(target);
            });
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
    
    // Set a step to a given boolean state and update UI
    setStep(instrument, sound, step, value) {
        this.sequence.tracks[instrument][sound][step] = !!value;
        const stepBtn = document.querySelector(
            `[data-instrument="${instrument}"][data-sound="${sound}"][data-step="${step}"]`
        );
        if (stepBtn) {
            stepBtn.classList.toggle('active', !!value);
            if (instrument === 'synths') {
                if (value) {
                    const midi = this.synthNotes[sound]?.[step] ?? 69;
                    stepBtn.textContent = this.midiToName(midi);
                    stepBtn.style.borderColor = this.noteColorForMidi(midi);
                } else {
                    stepBtn.textContent = '';
                    stepBtn.style.borderColor = '';
                }
            }
        }
        if (value) {
            if (instrument === 'drums') {
                this.audioEngine.playDrumSound(sound);
            } else {
                const midi = this.synthNotes[sound]?.[step] ?? 69;
                this.audioEngine.playSynthSound(sound, this.midiToFreq(midi));
            }
        }
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
            if (!currentState && instrument === 'synths') {
                // Ensure note label/color visible when activating
                const midi = this.synthNotes[sound]?.[step] ?? 69;
                stepBtn.textContent = this.midiToName(midi);
                stepBtn.style.borderColor = this.noteColorForMidi(midi);
            } else if (currentState && instrument === 'synths') {
                // Clearing label/color when deactivating
                stepBtn.textContent = '';
                stepBtn.style.borderColor = '';
            }
        }
        
        // Play sound for immediate feedback
        if (!currentState) {
            if (instrument === 'drums') {
                this.audioEngine.playDrumSound(sound);
            } else {
                const midi = this.synthNotes[sound]?.[step] ?? 69;
                this.audioEngine.playSynthSound(sound, this.midiToFreq(midi));
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
            // At end of loop, apply pending pattern
            if (this.currentStep === this.steps - 1 && this.patterns.pending) {
                this.applyPattern(this.patterns.pending);
                this.patterns.pending = null;
            }
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
                const midi = this.synthNotes[soundName]?.[step] ?? 69;
                this.audioEngine.playSynthSound(soundName, this.midiToFreq(midi));
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

    // ---- Bars & Time Signature management ----
    stepsPerBar() {
        // Keep a 16th-note resolution grid: steps per bar = numerator * (16 / denominator)
        return Math.max(1, Math.round(this.timeSignature.num * (16 / this.timeSignature.den)));
    }
    getBars() {
        // Bars are pattern-specific
        return this.patterns.store[this.patterns.active]?.bars || 1;
    }
    setBars(bars) {
        const clamped = Math.max(1, Math.min(16, bars)); // allow up to 16 bars for now
        // Persist bars to active pattern
        const pat = this.patterns.store[this.patterns.active];
        if (!pat) return;
        pat.bars = clamped;
        const newSteps = clamped * this.stepsPerBar();
        if (newSteps === this.steps) return;
        this.steps = newSteps;
        this.sequence.steps = newSteps;
        // Resize tracks
        const resize = (arr, len, fillVal=false) => {
            if (arr.length === len) return arr;
            if (arr.length < len) return arr.concat(new Array(len - arr.length).fill(fillVal));
            return arr.slice(0, len);
        };
        Object.keys(this.sequence.tracks.drums).forEach(name => {
            this.sequence.tracks.drums[name] = resize(this.sequence.tracks.drums[name], newSteps, false);
        });
        Object.keys(this.sequence.tracks.synths).forEach(name => {
            this.sequence.tracks.synths[name] = resize(this.sequence.tracks.synths[name], newSteps, false);
        });
        // Resize synth notes
        Object.keys(this.synthNotes).forEach(name => {
            this.synthNotes[name] = resize(this.synthNotes[name], newSteps, 69);
        });
        // Re-render UI
        this.renderStepIndicators();
        this.renderTracks();
        this.updateBarsDisplay();
        // Keep step index within bounds
        this.currentStep = this.currentStep % this.steps;
        if (this.isPlaying) this.updateStepInterval();
        // Resize stored patterns to the new length
        this.resizePatternsTo(this.steps);
    }
    addBars(delta) { this.setBars(this.getBars() + delta); }
    updateBarsDisplay() {
        const el = document.getElementById('bars-count');
        if (el) el.textContent = String(this.getBars());
    }

    applyTimeSignature() {
        // Recompute steps based on current pattern bars and new TS
        const bars = this.getBars();
        this.setBars(bars); // setBars handles recompute + resize + render
    }

    // ---- Pattern management ----
    createEmptyPattern() {
        const len = this.steps;
        const makeTrack = () => new Array(len).fill(false);
        return {
            bars: 1,
            tracks: {
                drums: { kick: makeTrack(), snare: makeTrack(), hihat: makeTrack(), openhat: makeTrack(), crash: makeTrack(), clap: makeTrack() },
                synths: { bass: makeTrack(), lead: makeTrack(), pad: makeTrack(), arp: makeTrack() }
            },
            removed: { drums: { kick: false, snare: false, hihat: false, openhat: false, crash: false, clap: false }, synths: { bass: false, lead: false, pad: false, arp: false } },
            synthNotes: { bass: new Array(len).fill(69), lead: new Array(len).fill(69), pad: new Array(len).fill(69), arp: new Array(len).fill(69) }
        };
    }
    resizePatternsTo(len) {
        const resize = (arr, L, fillVal=false) => arr.length < L ? arr.concat(new Array(L - arr.length).fill(fillVal)) : arr.slice(0, L);
        for (let i = 1; i <= 4; i++) {
            const p = this.patterns.store[i];
            if (!p) continue;
            ['kick','snare','hihat','openhat','crash','clap'].forEach(n => p.tracks.drums[n] = resize(p.tracks.drums[n], len, false));
            ['bass','lead','pad','arp'].forEach(n => {
                p.tracks.synths[n] = resize(p.tracks.synths[n], len, false);
                p.synthNotes[n] = resize(p.synthNotes[n], len, 69);
            });
        }
    }
    saveCurrentPattern() {
        const i = this.patterns.active;
        const deepCopy = (o) => JSON.parse(JSON.stringify(o));
        const store = this.patterns.store[i];
        store.tracks = deepCopy(this.sequence.tracks);
        store.removed = deepCopy(this.sequence.removed);
        store.synthNotes = deepCopy(this.synthNotes);
        store.bars = this.getBars();
    }
    applyPattern(i) {
        if (!this.patterns.store[i]) return;
        this.saveCurrentPattern();
        const deepCopy = (o) => JSON.parse(JSON.stringify(o));
        const p = this.patterns.store[i];
        // Ensure sizes match target steps based on this pattern's bars and current TS
        const newSteps = (p.bars || 1) * this.stepsPerBar();
        this.steps = newSteps;
        this.sequence.steps = newSteps;
        this.resizePatternsTo(this.steps);
        this.sequence.tracks = deepCopy(p.tracks);
        this.sequence.removed = deepCopy(p.removed);
        this.synthNotes = deepCopy(p.synthNotes);
        this.patterns.active = i;
        // Re-render UI for new pattern
        this.renderTracks();
        this.updatePatternButtons();
        this.updateBarsDisplay();
        this.renderStepIndicators();
    }
    requestPattern(i) {
        if (i === this.patterns.active) return;
        if (this.isPlaying) {
            this.patterns.pending = i;
        } else {
            this.applyPattern(i);
        }
    }
    updatePatternButtons() {
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            const num = parseInt(btn.dataset.pattern);
            btn.classList.toggle('active', num === this.patterns.active);
        });
    }
    
    loadSequence(sequenceData) {
        if (!sequenceData) return;
        
        this.sequence = { ...this.sequence, ...sequenceData };
        // Ensure new fields exist
        this.sequence.volume = this.sequence.volume || {};
        this.sequence.volume.perInstrument = this.sequence.volume.perInstrument || {
            drums: { kick: 0.8, snare: 0.8, hihat: 0.7, openhat: 0.7, crash: 0.6, clap: 0.7 },
            synths: { bass: 0.7, lead: 0.6, pad: 0.6, arp: 0.5 }
        };
        this.sequence.removed = this.sequence.removed || {
            drums: { kick: false, snare: false, hihat: false, openhat: false, crash: false, clap: false },
            synths: { bass: false, lead: false, pad: false, arp: false }
        };
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
        Object.entries(this.sequence.volume.perInstrument.drums).forEach(([name, v]) => {
            this.audioEngine.setInstrumentVolume('drums', name, v);
        });
        Object.entries(this.sequence.volume.perInstrument.synths).forEach(([name, v]) => {
            this.audioEngine.setInstrumentVolume('synths', name, v);
        });
        
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
