# Music Machine

A Flask-based music sequencer inspired by Teenage Engineering's design aesthetic. Create beats and melodies on the go with a clean, grid-based interface.

## Features

- **16-step sequencer** with visual grid interface
- **Drum machine** with 6 drum sounds (kick, snare, hi-hat, open hat, crash, clap)
- **Synthesizer** with 4 synth types (bass, lead, pad, arp)
- **Real-time audio synthesis** using Web Audio API
- **Save/Load sequences** with persistent storage
- **Mixer controls** with individual volume levels
- **Effects processing** (reverb, delay, filter)
- **Pattern management** with multiple pattern slots
- **Retro-futuristic UI** inspired by Teenage Engineering
- **Responsive design** that works on desktop and mobile

## Getting Started

### Prerequisites

- Python 3.7+
- Modern web browser with Web Audio API support

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HyprPixl/music-machine.git
cd music-machine
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Usage

### Creating Beats

1. **Click** on the grid buttons to activate steps in your sequence
2. **Use** different instrument tracks (drums and synths) to build your pattern
3. **Adjust** BPM using the tempo control
4. **Press Play** to hear your sequence

### Audio Controls

- **Master Volume**: Controls overall output level
- **Section Volumes**: Separate controls for drums and synths
- **Effects**: Add reverb, delay, and filtering to your sounds

### Saving Sequences

1. Click **SAVE** to open the sequence management dialog
2. Enter a name for your sequence
3. Click **Save New** to store your pattern

### Loading Sequences

1. Click **LOAD** to view saved sequences
2. Click on any sequence to load it

## Architecture

The application follows a modular architecture designed for expandability:

### Backend (Flask)
- `app.py` - Main application and routing
- `blueprints/` - Modular route handlers
  - `api.py` - REST API endpoints
  - `sequencer.py` - Sequencer-specific routes
- `models/` - Data models and business logic
  - `sequence.py` - Sequence management
  - `instruments.py` - Instrument definitions

### Frontend (Web)
- `static/js/` - JavaScript modules
  - `audio-engine.js` - Web Audio API implementation
  - `sequencer.js` - Sequencer logic and UI
  - `app.js` - Main application orchestration
- `static/css/` - Styling
  - `style.css` - Complete UI styling with TE-inspired aesthetics
- `templates/` - HTML templates
  - `index.html` - Main interface template

## Expanding the Application

The codebase is designed for easy expansion:

### Adding New Instruments

1. Define new instrument types in `models/instruments.py`
2. Add corresponding audio generation in `audio-engine.js`
3. Update the UI rendering in `sequencer.js`

### Adding New Effects

1. Implement effect processing in `audio-engine.js`
2. Add UI controls in the HTML template
3. Wire up the controls in `sequencer.js`

### Adding New Features

- **MIDI Support**: Add Web MIDI API integration
- **Recording**: Implement audio recording functionality
- **Collaboration**: Add real-time collaboration features
- **Sample Import**: Allow users to upload custom samples
- **Pattern Chaining**: Create song arrangements from patterns

## Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Audio**: Web Audio API
- **Storage**: In-memory (easily extensible to database)
- **Styling**: Custom CSS with CSS Grid and Flexbox

## Browser Compatibility

- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.