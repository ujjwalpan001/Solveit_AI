from gtts import gTTS
import uuid
from pathlib import Path

def generate_tts(text: str, language: str = "en", output_dir: str = "../uploads/videos"):
    """Generate TTS audio file"""
    try:
        # Create output directory if it doesn't exist
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        audio_filename = f"{audio_id}.mp3"
        audio_path = Path(output_dir) / audio_filename
        
        # Generate TTS
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(str(audio_path))
        
        return str(audio_path)
        
    except Exception as e:
        print(f"TTS generation error: {e}")
        return None

if __name__ == "__main__":
    # Test TTS generation
    test_text = "Hello, this is a test of the text-to-speech system."
    result = generate_tts(test_text)
    print(f"Generated audio: {result}")
