"""
Sequence Management - Handle sequence data and operations
"""

import uuid
import time
from typing import Dict, List, Optional

class SequenceManager:
    """Manages sequences and their data"""
    
    def __init__(self):
        # In-memory storage (in production, use a database)
        self.sequences: Dict[str, Dict] = {}
        self.session_sequences: Dict[str, List[str]] = {}
    
    def create_sequence(self, session_id: str, name: str, bpm: int = 120, steps: int = 16) -> str:
        """Create a new sequence"""
        sequence_id = str(uuid.uuid4())
        
        sequence_data = {
            'id': sequence_id,
            'session_id': session_id,
            'name': name,
            'bpm': bpm,
            'steps': steps,
            'created_at': time.time(),
            'updated_at': time.time(),
            'tracks': {
                'drums': {
                    'kick': [False] * steps,
                    'snare': [False] * steps,
                    'hihat': [False] * steps,
                    'openhat': [False] * steps,
                    'crash': [False] * steps,
                    'clap': [False] * steps
                },
                'synths': {
                    'bass': [False] * steps,
                    'lead': [False] * steps,
                    'pad': [False] * steps,
                    'pluck': [False] * steps
                }
            },
            'volume': {
                'master': 0.7,
                'drums': 0.75,
                'synths': 0.65
            },
            'effects': {
                'reverb': 0.2,
                'delay': 0.1,
                'filter': 0.0
            }
        }
        
        self.sequences[sequence_id] = sequence_data
        
        if session_id not in self.session_sequences:
            self.session_sequences[session_id] = []
        self.session_sequences[session_id].append(sequence_id)
        
        return sequence_id
    
    def get_sequence(self, sequence_id: str) -> Optional[Dict]:
        """Get a specific sequence by ID"""
        return self.sequences.get(sequence_id)
    
    def get_session_sequences(self, session_id: str) -> List[Dict]:
        """Get all sequences for a session"""
        sequence_ids = self.session_sequences.get(session_id, [])
        return [self.sequences[seq_id] for seq_id in sequence_ids if seq_id in self.sequences]
    
    def update_sequence(self, sequence_id: str, data: Dict) -> bool:
        """Update sequence data"""
        if sequence_id not in self.sequences:
            return False
        
        sequence = self.sequences[sequence_id]
        sequence['updated_at'] = time.time()
        
        # Update allowed fields
        allowed_fields = ['name', 'bpm', 'tracks', 'volume', 'effects']
        for field in allowed_fields:
            if field in data:
                sequence[field] = data[field]
        
        return True
    
    def delete_sequence(self, sequence_id: str) -> bool:
        """Delete a sequence"""
        if sequence_id not in self.sequences:
            return False
        
        sequence = self.sequences[sequence_id]
        session_id = sequence['session_id']
        
        # Remove from sequences
        del self.sequences[sequence_id]
        
        # Remove from session sequences
        if session_id in self.session_sequences:
            if sequence_id in self.session_sequences[session_id]:
                self.session_sequences[session_id].remove(sequence_id)
        
        return True
