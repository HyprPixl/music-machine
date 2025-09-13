"""
Music Machine - A Flask-based music sequencer inspired by Teenage Engineering
"""

from flask import Flask, render_template, jsonify, request, session
from flask_cors import CORS
import os
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# Import blueprints
from blueprints.sequencer import sequencer_bp
from blueprints.api import api_bp

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    
    # Enable CORS for frontend-backend communication
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(sequencer_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        """Main sequencer interface"""
        if 'session_id' not in session:
            session['session_id'] = str(uuid.uuid4())
        return render_template('index.html')
    
    @app.route('/health')
    def health_check():
        """Health check endpoint"""
        return jsonify({'status': 'healthy', 'app': 'music-machine'})
    
    return app

# Create the WSGI application at import time for Gunicorn (app:app)
app = create_app()

if __name__ == '__main__':
    # Allow overriding via PORT env var; default to 5050
    port = int(os.environ.get('PORT', 5050))
    # Configure debug from environment; default False to avoid reloader issues in sandbox
    debug_flag = str(os.environ.get('FLASK_DEBUG', 'False')).lower() in ('1', 'true', 'yes', 'on')
    app.run(debug=debug_flag, use_reloader=debug_flag, host='0.0.0.0', port=port)
