/**
 * Main Application - Orchestrates all components
 */

class MusicMachineApp {
    constructor() {
        this.audioEngine = null;
        this.sequencer = null;
        this.apiClient = new ApiClient();
        
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            // Initialize audio engine
            this.audioEngine = new AudioEngine();
            
            // Wait a bit for audio context to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize sequencer
            this.sequencer = new Sequencer(this.audioEngine);
            
            // Bind app-level events
            this.bindAppEvents();
            
            // Load instruments data
            await this.loadInstruments();
            
            console.log('Music Machine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Music Machine:', error);
        }
    }
    
    bindAppEvents() {
        // Sequence management
        document.getElementById('new-sequence-btn').addEventListener('click', () => {
            this.newSequence();
        });
        
        document.getElementById('save-sequence-btn').addEventListener('click', () => {
            this.showSaveDialog();
        });
        
        document.getElementById('load-sequence-btn').addEventListener('click', () => {
            this.showLoadDialog();
        });
        
        // Modal events
        this.bindModalEvents();
        
        // Pattern buttons are handled by Sequencer now for quantized switching
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented) return; // grid editing may consume keys like Space/Tab
            this.handleKeyboardShortcuts(e);
        });
    }
    
    bindModalEvents() {
        const modal = document.getElementById('sequence-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-btn');
        const saveNewBtn = document.getElementById('save-new-btn');
        
        closeBtn.addEventListener('click', () => {
            this.hideModal();
        });
        
        cancelBtn.addEventListener('click', () => {
            this.hideModal();
        });
        
        saveNewBtn.addEventListener('click', () => {
            this.saveNewSequence();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }
    
    async loadInstruments() {
        try {
            const response = await this.apiClient.getInstruments();
            console.log('Loaded instruments:', response.instruments);
        } catch (error) {
            console.error('Failed to load instruments:', error);
        }
    }
    
    newSequence() {
        this.sequencer.clearSequence();
        this.sequencer.currentSequenceId = null;
        console.log('Created new sequence');
    }
    
    showSaveDialog() {
        const modal = document.getElementById('sequence-modal');
        const nameInput = document.getElementById('sequence-name');
        
        nameInput.value = this.sequencer.sequence.name;
        modal.style.display = 'block';
        nameInput.focus();
    }
    
    async showLoadDialog() {
        const modal = document.getElementById('sequence-modal');
        const sequencesList = document.getElementById('sequences-list');
        
        try {
            const response = await this.apiClient.getSequences();
            const sequences = response.sequences || [];
            
            sequencesList.innerHTML = '';
            
            if (sequences.length === 0) {
                sequencesList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No saved sequences</p>';
            } else {
                sequences.forEach(sequence => {
                    const item = document.createElement('div');
                    item.className = 'sequence-item';
                    item.innerHTML = `
                        <strong>${sequence.name}</strong><br>
                        <small>BPM: ${sequence.bpm} | Steps: ${sequence.steps}</small>
                    `;
                    item.addEventListener('click', () => {
                        this.loadSequence(sequence.id);
                        this.hideModal();
                    });
                    sequencesList.appendChild(item);
                });
            }
            
            modal.style.display = 'block';
        } catch (error) {
            console.error('Failed to load sequences:', error);
            alert('Failed to load sequences');
        }
    }
    
    async saveNewSequence() {
        const nameInput = document.getElementById('sequence-name');
        const sequenceName = nameInput.value.trim() || 'Untitled Sequence';
        
        try {
            const sequenceData = this.sequencer.getSequenceData();
            sequenceData.name = sequenceName;
            
            if (this.sequencer.currentSequenceId) {
                // Update existing sequence
                await this.apiClient.updateSequence(this.sequencer.currentSequenceId, sequenceData);
                console.log('Sequence updated successfully');
            } else {
                // Create new sequence
                const response = await this.apiClient.createSequence(sequenceData);
                this.sequencer.currentSequenceId = response.sequence_id;
                console.log('Sequence saved with ID:', response.sequence_id);
            }
            
            this.sequencer.sequence.name = sequenceName;
            this.hideModal();
            
        } catch (error) {
            console.error('Failed to save sequence:', error);
            alert('Failed to save sequence');
        }
    }
    
    async loadSequence(sequenceId) {
        try {
            const response = await this.apiClient.getSequence(sequenceId);
            this.sequencer.loadSequence(response.sequence);
            console.log('Sequence loaded:', response.sequence.name);
        } catch (error) {
            console.error('Failed to load sequence:', error);
            alert('Failed to load sequence');
        }
    }
    
    hideModal() {
        document.getElementById('sequence-modal').style.display = 'none';
    }
    
    // selectPattern handled by Sequencer (quantized). Keeping function stub if referenced.
    selectPattern(patternNumber) {
        const n = parseInt(patternNumber);
        this.sequencer?.requestPattern(n);
    }
    
    handleKeyboardShortcuts(e) {
        // Prevent shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.sequencer.isPlaying ? this.sequencer.stop() : this.sequencer.play();
                break;
            case 'Escape':
                e.preventDefault();
                this.sequencer.stop();
                break;
            case 'KeyN':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.newSequence();
                }
                break;
            case 'KeyS':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.showSaveDialog();
                }
                break;
            case 'KeyL':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.showLoadDialog();
                }
                break;
        }
    }
}

/**
 * API Client for backend communication
 */
class ApiClient {
    constructor() {
        this.baseUrl = '/api';
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    async getSequences() {
        return await this.request('/sequences');
    }
    
    async getSequence(sequenceId) {
        return await this.request(`/sequences/${sequenceId}`);
    }
    
    async createSequence(sequenceData) {
        return await this.request('/sequences', {
            method: 'POST',
            body: JSON.stringify(sequenceData)
        });
    }
    
    async updateSequence(sequenceId, sequenceData) {
        return await this.request(`/sequences/${sequenceId}`, {
            method: 'PUT',
            body: JSON.stringify(sequenceData)
        });
    }
    
    async deleteSequence(sequenceId) {
        return await this.request(`/sequences/${sequenceId}`, {
            method: 'DELETE'
        });
    }
    
    async getInstruments() {
        return await this.request('/instruments');
    }
    
    async playSequence(sequenceId) {
        return await this.request(`/play/${sequenceId}`, {
            method: 'POST'
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize immediately so the UI renders without requiring a click
    window.musicMachine = new MusicMachineApp();
    // Note: Audio output may require a user gesture; handled in Sequencer.play()
});
