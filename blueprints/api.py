"""
API Blueprint - RESTful API for sequencer operations
"""

from flask import Blueprint, jsonify, request, session
from models.sequence import SequenceManager
from models.instruments import DrumMachine, Synthesizer

api_bp = Blueprint('api', __name__)

# Global managers (in production, use proper dependency injection)
sequence_manager = SequenceManager()
drum_machine = DrumMachine()
synthesizer = Synthesizer()

@api_bp.route('/sequences', methods=['GET'])
def get_sequences():
    """Get all sequences for the current session"""
    session_id = session.get('session_id')
    if not session_id:
        return jsonify({'error': 'No session found'}), 400
    
    sequences = sequence_manager.get_session_sequences(session_id)
    return jsonify({'sequences': sequences})

@api_bp.route('/sequences', methods=['POST'])
def create_sequence():
    """Create a new sequence"""
    session_id = session.get('session_id')
    if not session_id:
        return jsonify({'error': 'No session found'}), 400
    
    data = request.get_json()
    sequence_name = data.get('name', 'Untitled Sequence')
    bpm = data.get('bpm', 120)
    steps = data.get('steps', 16)
    
    sequence_id = sequence_manager.create_sequence(session_id, sequence_name, bpm, steps)
    return jsonify({'sequence_id': sequence_id, 'message': 'Sequence created successfully'})

@api_bp.route('/sequences/<sequence_id>', methods=['GET'])
def get_sequence(sequence_id):
    """Get a specific sequence"""
    sequence = sequence_manager.get_sequence(sequence_id)
    if not sequence:
        return jsonify({'error': 'Sequence not found'}), 404
    return jsonify({'sequence': sequence})

@api_bp.route('/sequences/<sequence_id>', methods=['PUT'])
def update_sequence(sequence_id):
    """Update a sequence"""
    data = request.get_json()
    success = sequence_manager.update_sequence(sequence_id, data)
    if not success:
        return jsonify({'error': 'Sequence not found'}), 404
    return jsonify({'message': 'Sequence updated successfully'})

@api_bp.route('/sequences/<sequence_id>', methods=['DELETE'])
def delete_sequence(sequence_id):
    """Delete a sequence"""
    success = sequence_manager.delete_sequence(sequence_id)
    if not success:
        return jsonify({'error': 'Sequence not found'}), 404
    return jsonify({'message': 'Sequence deleted successfully'})

@api_bp.route('/instruments', methods=['GET'])
def get_instruments():
    """Get available instruments and their configurations"""
    return jsonify({
        'instruments': {
            'drums': drum_machine.get_available_sounds(),
            'synths': synthesizer.get_available_sounds()
        }
    })

@api_bp.route('/play/<sequence_id>', methods=['POST'])
def play_sequence(sequence_id):
    """Trigger sequence playback (placeholder for Web Audio API)"""
    sequence = sequence_manager.get_sequence(sequence_id)
    if not sequence:
        return jsonify({'error': 'Sequence not found'}), 404
    
    # In a real implementation, this would trigger audio playback
    return jsonify({'message': f'Playing sequence {sequence_id}', 'sequence': sequence})