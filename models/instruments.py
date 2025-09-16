"""
Instruments - Define available instruments and their properties
"""

from typing import Dict, List

class DrumMachine:
    """Drum machine with various drum sounds"""
    
    def __init__(self):
        self.sounds = {
            'kick': {
                'name': 'Kick Drum',
                'type': 'drum',
                'frequency': 60,
                'decay': 0.5,
                'color': '#ff6b6b'
            },
            'snare': {
                'name': 'Snare Drum',
                'type': 'drum',
                'frequency': 200,
                'decay': 0.3,
                'color': '#4ecdc4'
            },
            'hihat': {
                'name': 'Hi-Hat Closed',
                'type': 'drum',
                'frequency': 8000,
                'decay': 0.1,
                'color': '#45b7d1'
            },
            'openhat': {
                'name': 'Hi-Hat Open',
                'type': 'drum',
                'frequency': 6000,
                'decay': 0.2,
                'color': '#96ceb4'
            },
            'crash': {
                'name': 'Crash Cymbal',
                'type': 'drum',
                'frequency': 5000,
                'decay': 1.0,
                'color': '#feca57'
            },
            'clap': {
                'name': 'Hand Clap',
                'type': 'drum',
                'frequency': 1000,
                'decay': 0.2,
                'color': '#ff9ff3'
            }
        }
    
    def get_available_sounds(self) -> Dict:
        """Get all available drum sounds"""
        return self.sounds
    
    def get_sound_config(self, sound_name: str) -> Dict:
        """Get configuration for a specific sound"""
        return self.sounds.get(sound_name, {})

class Synthesizer:
    """Synthesizer with various synth sounds"""
    
    def __init__(self):
        self.sounds = {
            'bass': {
                'name': 'Bass Synth',
                'type': 'synth',
                'waveform': 'sawtooth',
                'frequency': 80,
                'attack': 0.01,
                'decay': 0.3,
                'sustain': 0.7,
                'release': 0.5,
                'color': '#e17055'
            },
            'lead': {
                'name': 'Lead Synth',
                'type': 'synth',
                'waveform': 'square',
                'frequency': 440,
                'attack': 0.05,
                'decay': 0.2,
                'sustain': 0.5,
                'release': 0.3,
                'color': '#a29bfe'
            },
            'pad': {
                'name': 'Pad Synth',
                'type': 'synth',
                'waveform': 'sine',
                'frequency': 220,
                'attack': 0.5,
                'decay': 0.3,
                'sustain': 0.8,
                'release': 1.0,
                'color': '#6c5ce7'
            },
            'pluck': {
                'name': 'Pluck Synth',
                'type': 'synth',
                'waveform': 'triangle',
                'frequency': 440,
                'attack': 0.01,
                'decay': 0.1,
                'sustain': 0.5,
                'release': 0.3,
                'color': '#ff6b81'
            }
        }
    
    def get_available_sounds(self) -> Dict:
        """Get all available synth sounds"""
        return self.sounds
    
    def get_sound_config(self, sound_name: str) -> Dict:
        """Get configuration for a specific sound"""
        return self.sounds.get(sound_name, {})
