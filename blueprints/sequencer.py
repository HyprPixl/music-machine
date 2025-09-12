"""
Sequencer Blueprint - Main sequencer functionality
"""

from flask import Blueprint, render_template, session
import uuid

sequencer_bp = Blueprint('sequencer', __name__)

@sequencer_bp.route('/sequencer')
def sequencer_interface():
    """Dedicated sequencer interface route"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return render_template('sequencer.html')