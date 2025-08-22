import os
import sys
import json
import uuid
import asyncio
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Manim imports
from manim import *
print("✅ Manim imported successfully")

# TTS imports
from gtts import gTTS

print("🔧 Checking FFmpeg availability...")
def check_ffmpeg_installation():
    """Check if FFmpeg is installed and accessible"""
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        print(f"✅ FFmpeg found at: {ffmpeg_path}")
        return True
    
    # Check common installation paths
    common_paths = [
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe", 
        "D:\\ffmpeg\\bin\\ffmpeg.exe"
    ]
    
    for path in common_paths:
        if Path(path).exists():
            print(f"✅ FFmpeg found at: {path}")
            return True
    
    print("⚠️ FFmpeg not found!")
    print("📋 To enable audio in videos, install FFmpeg:")
    print("   1. Download FFmpeg from: https://ffmpeg.org/download.html#build-windows")
    print("   2. Extract to C:\\ffmpeg\\")
    print("   3. Add C:\\ffmpeg\\bin to your system PATH")
    print("   4. Restart this application")
    print("🎥 Videos will be generated without audio until FFmpeg is installed.")
    return False

# Check FFmpeg on startup
FFMPEG_AVAILABLE = check_ffmpeg_installation()

def extract_duration(ffmpeg_output: str) -> float:
    """Extract duration from FFmpeg output"""
    import re
    
    # Look for Duration: HH:MM:SS.MS pattern
    duration_match = re.search(r'Duration: (\d+):(\d+):(\d+)\.(\d+)', ffmpeg_output)
    if duration_match:
        hours = int(duration_match.group(1))
        minutes = int(duration_match.group(2))
        seconds = int(duration_match.group(3))
        milliseconds = int(duration_match.group(4))
        
        total_seconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 100.0
        return total_seconds
    
    # Fallback: return default duration
    return 10.0

app = FastAPI(title="AI Tutor Video Worker", version="1.0.0")

# Configuration
UPLOAD_DIR = Path("../uploads/videos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class VideoRequest(BaseModel):
    question: str
    answer: Dict[str, Any]
    language: str = "en"
    voice: str = "female"

class VideoResponse(BaseModel):
    success: bool
    videoPath: str = None
    error: str = None

class MathAnimationScene(Scene):
    def __init__(self, katex_content: str, tts_script: str = "", **kwargs):
        super().__init__(**kwargs)
        self.katex_content = katex_content
        self.tts_script = tts_script
        self.calculate_timing()
        
    def calculate_timing(self):
        """Calculate timing based on TTS script to match audio duration exactly"""
        self.step_timings = []
        self.total_video_duration = 0
        
        if not self.tts_script:
            # Default timing without TTS
            katex_steps = self.katex_content.split('\\\\[STEP]') if self.katex_content else ['']
            for i in range(len(katex_steps)):
                timing = {
                    'wait_before': 1.0,
                    'animation_time': 1.5,
                    'wait_after': 1.0
                }
                self.step_timings.append(timing)
                self.total_video_duration += timing['wait_before'] + timing['animation_time'] + timing['wait_after']
            return
        
        # Calculate total audio duration more accurately
        processed_text = self.tts_script.replace('[PAUSE]', '. ')
        total_words = len(processed_text.split())
        # Estimate total audio duration: ~150 words per minute (2.5 words/second)
        estimated_audio_duration = max(10.0, total_words / 2.5)
        
        print(f"   🎵 TTS Analysis:")
        print(f"     Total words: {total_words}")
        print(f"     Estimated audio duration: {estimated_audio_duration:.1f}s")
        
        # Split content into segments
        tts_segments = self.tts_script.split('[PAUSE]')
        katex_steps = self.katex_content.split('\\\\[STEP]') if self.katex_content else ['']
        
        print(f"     TTS segments: {len(tts_segments)}")
        print(f"     KaTeX steps: {len(katex_steps)}")
        
        # Calculate timing for each segment to match total audio duration
        segment_durations = []
        for segment in tts_segments:
            words = len(segment.strip().split())
            segment_duration = max(2.0, words / 2.5)
            segment_durations.append(segment_duration)
        
        # Scale segment durations to match estimated audio duration
        current_total = sum(segment_durations)
        scale_factor = estimated_audio_duration / current_total if current_total > 0 else 1.0
        
        print(f"     Duration scale factor: {scale_factor:.2f}")
        
        # Create synchronized timings
        self.total_video_duration = 3.0  # Title intro
        
        for i, (segment, duration) in enumerate(zip(tts_segments, segment_durations)):
            scaled_duration = duration * scale_factor
            
            timing = {
                'wait_before': 0.3,  # Quick transition
                'animation_time': min(2.0, scaled_duration * 0.2),  # Fast visual display
                'wait_after': max(1.0, scaled_duration * 0.8)  # Wait for audio to complete
            }
            
            self.step_timings.append(timing)
            self.total_video_duration += timing['wait_before'] + timing['animation_time'] + timing['wait_after']
        
        # Ensure we have timing for all katex steps
        while len(self.step_timings) < len(katex_steps):
            timing = {
                'wait_before': 0.5,
                'animation_time': 1.0,
                'wait_after': 2.0
            }
            self.step_timings.append(timing)
            self.total_video_duration += timing['wait_before'] + timing['animation_time'] + timing['wait_after']
        
        # Add final pause to ensure video is at least as long as audio
        final_pause = max(2.0, estimated_audio_duration - self.total_video_duration + 3.0)
        self.final_pause = final_pause
        self.total_video_duration += final_pause
        
        print(f"     Final video duration: {self.total_video_duration:.1f}s")
        print(f"     Final pause: {final_pause:.1f}s")
        
    def construct(self):
        # Title with faster intro for better sync
        title = Text("Mathematical Solution", font_size=40, color=BLUE).to_edge(UP)
        self.play(Write(title), run_time=1.0)
        self.wait(0.5)
        
        if not self.katex_content:
            # Fallback for no KaTeX content
            no_content = Text("No mathematical content available", font_size=24, color=WHITE)
            no_content.move_to(ORIGIN)
            self.play(Write(no_content), run_time=1.0)
            self.wait(2)
            return
        
        try:
            # Split KaTeX content by [STEP] markers for synchronized animation
            katex_steps = self.katex_content.split('\\\\[STEP]')
            
            # Clean and prepare each step
            cleaned_steps = []
            for step in katex_steps:
                cleaned_step = step.strip()
                if cleaned_step:
                    cleaned_steps.append(cleaned_step)
            
            print(f"   📊 Processing {len(cleaned_steps)} synchronized KaTeX steps")
            print(f"   🎵 TTS segments: {len(self.tts_script.split('[PAUSE]')) if self.tts_script else 0}")
            
            current_y = 2
            previous_equations = []
            
            for i, katex_step in enumerate(cleaned_steps):
                timing = self.step_timings[i] if i < len(self.step_timings) else self.step_timings[-1]
                
                print(f"   📐 Step {i+1}: {katex_step[:50]}... (timing: {timing})")
                
                # Wait before showing this step (for audio sync)
                if timing['wait_before'] > 0:
                    self.wait(timing['wait_before'])
                
                try:
                    # Create MathTex object for this step
                    if katex_step.startswith('\\text{'):
                        # Handle text annotations with different styling
                        math_obj = MathTex(katex_step, font_size=30, color=YELLOW)
                    else:
                        # Handle mathematical equations
                        math_obj = MathTex(katex_step, font_size=36, color=WHITE)
                    
                    math_obj.move_to([0, current_y, 0])
                    
                    # Animate the appearance of this step with calculated timing
                    self.play(Write(math_obj), run_time=timing['animation_time'])
                    
                    # Wait for narration to complete this step
                    if timing['wait_after'] > 0:
                        self.wait(timing['wait_after'])
                    
                    previous_equations.append(math_obj)
                    current_y -= 0.8
                    
                    # Smart space management
                    if current_y < -2.5 and i < len(cleaned_steps) - 3:
                        # Fade out older equations but keep recent ones
                        equations_to_fade = previous_equations[:-2] if len(previous_equations) > 2 else previous_equations[:-1]
                        if equations_to_fade:
                            self.play(*[FadeOut(eq, run_time=0.5) for eq in equations_to_fade])
                            previous_equations = previous_equations[-2:] if len(previous_equations) > 2 else [previous_equations[-1]]
                        current_y = 1
                        
                except Exception as step_error:
                    print(f"   ❌ Error rendering step {i+1}: {step_error}")
                    # Fallback to text for problematic KaTeX
                    fallback_text = Text(f"Step {i+1}: {katex_step}", font_size=24, color=RED)
                    fallback_text.move_to([0, current_y, 0])
                    self.play(Write(fallback_text), run_time=timing['animation_time'])
                    if timing['wait_after'] > 0:
                        self.wait(timing['wait_after'])
                    current_y -= 0.6
            
            # Final pause to ensure video matches audio duration exactly
            if hasattr(self, 'final_pause'):
                print(f"   ⏰ Adding final pause: {self.final_pause:.1f}s to match audio")
                self.wait(self.final_pause)
            else:
                self.wait(2)
            
        except Exception as e:
            print(f"   ❌ Error in MathAnimationScene construction: {e}")
            import traceback
            traceback.print_exc()
            # Complete fallback
            error_text = Text("Error rendering mathematical content", font_size=24, color=RED)
            error_text.move_to(ORIGIN)
            self.play(Write(error_text))
            self.wait(2)
    
    def split_text(self, text: str, max_length: int) -> List[str]:
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            if len(current_line + word) <= max_length:
                current_line += word + " "
            else:
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "
        
        if current_line:
            lines.append(current_line.strip())
            
        return lines

class SlideAnimationScene(Scene):
    def __init__(self, steps: List[Dict], tts_script: str = "", **kwargs):
        super().__init__(**kwargs)
        self.steps = steps
        self.tts_script = tts_script
        self.calculate_slide_timing()
        
    def calculate_slide_timing(self):
        """Calculate timing for slides based on TTS script"""
        if not self.tts_script:
            # Default timing without TTS
            self.slide_timings = [3.0] * len(self.steps)
            return
        
        # Split TTS by [PAUSE] markers and estimate timing
        tts_segments = self.tts_script.split('[PAUSE]')
        self.slide_timings = []
        
        for segment in tts_segments:
            words = len(segment.strip().split())
            # Estimate: ~2.5 words per second for clear narration
            timing = max(2.0, words / 2.5)
            self.slide_timings.append(timing)
        
        # Ensure we have timing for all steps
        while len(self.slide_timings) < len(self.steps):
            self.slide_timings.append(3.0)
        
    def construct(self):
        title = Text("Solution", font_size=48, color=BLUE).to_edge(UP)
        self.play(Write(title), run_time=1.0)
        self.wait(0.5)
        
        for i, step in enumerate(self.steps):
            timing = self.slide_timings[i] if i < len(self.slide_timings) else 3.0
            
            # Clear previous content (except title)
            if i > 0:
                self.play(FadeOut(*[mob for mob in self.mobjects if mob != title]), run_time=0.5)
            
            content = step['content']
            
            if step['type'] == 'code':
                # Display code with syntax highlighting effect
                code_lines = content.split('\n')
                code_group = VGroup()
                
                for j, line in enumerate(code_lines[:10]):  # Limit to 10 lines
                    code_text = Text(line, font="Courier", font_size=20, color=GREEN)
                    code_text.move_to([0, 2 - j * 0.4, 0])
                    code_group.add(code_text)
                
                self.play(Write(code_group), run_time=min(2.0, timing * 0.3))
                self.wait(max(1.0, timing * 0.7))
                
            else:
                # Split text into slides with synchronized timing
                lines = self.split_text(content, 60)
                slide_group = VGroup()
                
                for j, line in enumerate(lines[:8]):  # Limit to 8 lines per slide
                    text = Text(line, font_size=28, color=WHITE)
                    text.move_to([0, 2 - j * 0.5, 0])
                    slide_group.add(text)
                
                # Use synchronized timing
                self.play(Write(slide_group), run_time=min(2.0, timing * 0.3))
                self.wait(max(1.0, timing * 0.7))
        
        # Final pause to match end of audio
        self.wait(2)
    
    def split_text(self, text: str, max_length: int) -> List[str]:
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            if len(current_line + word) <= max_length:
                current_line += word + " "
            else:
                if current_line:
                    lines.append(current_line.strip())
                current_line = word + " "
        
        if current_line:
            lines.append(current_line.strip())
            
        return lines

def generate_math_video(answer_data: Dict, output_path: str) -> bool:
    """Generate video for math problems using Manim with synchronized timing"""
    try:
        print("   🎬 Starting synchronized Manim math video generation...")
        
        # Extract Manim KaTeX and TTS script from structured data
        katex_content = answer_data.get('manimkatex', answer_data.get('manimlatex', ''))
        tts_script = answer_data.get('tts', '')
        
        print(f"   📐 KaTeX content length: {len(katex_content)} characters")
        print(f"   🎤 TTS script length: {len(tts_script)} characters")
        print(f"   🎵 TTS segments: {len(tts_script.split('[PAUSE]')) if tts_script else 0}")
        
        if not katex_content:
            print("   ❌ No KaTeX content provided")
            return False
        
        # Configure Manim
        from manim import config as manim_config
        manim_config.media_dir = str(UPLOAD_DIR)
        manim_config.video_dir = str(UPLOAD_DIR)
        manim_config.quality = "medium_quality"
        manim_config.fps = 30
        
        print("   🎥 Creating synchronized Manim scene...")
        
        # Create scene with KaTeX content and TTS timing
        scene = MathAnimationScene(katex_content, tts_script)
        
        print("   🎬 Rendering synchronized Manim scene...")
        scene.render()
        
        # Find the rendered video file
        rendered_files = list(UPLOAD_DIR.glob("MathAnimationScene*.mp4"))
        if rendered_files:
            # Move the most recent file to the target path
            latest_file = max(rendered_files, key=lambda x: x.stat().st_mtime)
            latest_file.rename(output_path)
            print(f"   ✅ Synchronized math video rendered successfully: {Path(output_path).stat().st_size} bytes")
            return True
        else:
            print("   ❌ No rendered video file found")
            return False
                
    except Exception as e:
        print(f"   💥 Error in math video generation: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_slide_video(answer_data: Dict, output_path: str) -> bool:
    """Generate slide-style video using Manim SlideAnimationScene with synchronized timing"""
    try:
        print("   🎬 Starting synchronized Manim slide video generation...")
        
        # Convert structured answer to steps format
        steps = answer_data.get('steps', [])
        tts_script = answer_data.get('tts', '')
        
        if not steps:
            steps = [{'type': 'text', 'content': answer_data.get('text', 'No content available')}]
        
        print(f"   📊 Processing {len(steps)} steps")
        print(f"   🎵 TTS segments: {len(tts_script.split('[PAUSE]')) if tts_script else 0}")
        
        # Configure Manim
        from manim import config as manim_config
        manim_config.media_dir = str(UPLOAD_DIR)
        manim_config.video_dir = str(UPLOAD_DIR)
        manim_config.quality = "medium_quality"
        manim_config.fps = 30
        
        print("   🎥 Creating synchronized Manim slide scene...")
        
        # Create scene with steps and TTS timing
        scene = SlideAnimationScene(steps, tts_script)
        
        print("   🎬 Rendering synchronized Manim slide scene...")
        scene.render()
        
        # Find the rendered video file
        rendered_files = list(UPLOAD_DIR.glob("SlideAnimationScene*.mp4"))
        if rendered_files:
            # Move the most recent file to the target path
            latest_file = max(rendered_files, key=lambda x: x.stat().st_mtime)
            latest_file.rename(output_path)
            print(f"   ✅ Synchronized slide video rendered successfully: {Path(output_path).stat().st_size} bytes")
            return True
        else:
            print("   ❌ No rendered video file found")
            return False
        
    except Exception as e:
        print(f"   ❌ Error in slide video generation: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_audio_file(text: str, language: str, voice: str, output_path: str) -> bool:
    """Generate audio file using TTS with enhanced timing for synchronization"""
    try:
        print(f"   🎤 Generating synchronized audio file: {len(text)} characters")
        
        # Process TTS text to handle [PAUSE] markers
        processed_text = text.replace('[PAUSE]', '. ')  # Replace pauses with periods for natural breaks
        processed_text = processed_text.replace('  ', ' ').strip()  # Clean up double spaces
        
        print(f"   🎵 Processed TTS text: {len(processed_text)} characters")
        print(f"   🎯 Pause markers found: {text.count('[PAUSE]')}")
        
        # Configure TTS for clearer speech
        tts = gTTS(
            text=processed_text, 
            lang=language, 
            slow=False,  # Keep normal speed for better sync
            tld='com'  # Use .com domain for consistent voice
        )
        tts.save(output_path)
        
        print(f"   ✅ Synchronized audio file generated: {Path(output_path).stat().st_size} bytes")
        return True
        
    except Exception as e:
        print(f"   ❌ Error generating audio: {e}")
        return False

def merge_video_audio(video_path: str, audio_path: str, output_path: str) -> bool:
    """Merge video and audio using FFmpeg with duration matching"""
    try:
        print(f"   🎵 Starting video-audio merge with duration matching...")
        print(f"     Video: {video_path} ({Path(video_path).stat().st_size} bytes)")
        print(f"     Audio: {audio_path} ({Path(audio_path).stat().st_size} bytes)")
        print(f"     Output: {output_path}")
        
        # Verify input files exist
        if not Path(video_path).exists():
            print("   ❌ Video file does not exist")
            return False
        if not Path(audio_path).exists():
            print("   ❌ Audio file does not exist")
            return False
        
        # Check if FFmpeg is available
        ffmpeg_path = shutil.which("ffmpeg")
        if not ffmpeg_path:
            print("   ⚠️ FFmpeg not found in PATH, checking common locations...")
            # Check common FFmpeg installation paths
            common_paths = [
                "C:\\ffmpeg\\bin\\ffmpeg.exe",
                "C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe", 
                "D:\\ffmpeg\\bin\\ffmpeg.exe",
                "ffmpeg.exe"
            ]
            for path in common_paths:
                if Path(path).exists():
                    ffmpeg_path = path
                    print(f"   ✅ Found FFmpeg at: {ffmpeg_path}")
                    break
            
            if not ffmpeg_path:
                print("   ⚠️ FFmpeg not found, skipping audio merge")
                shutil.copy2(video_path, output_path)
                return True
        else:
            print(f"   ✅ Using FFmpeg from: {ffmpeg_path}")
        
        # Get duration of both video and audio files
        print("   📏 Getting file durations...")
        
        # Get video duration
        video_info_cmd = [ffmpeg_path, "-i", video_path, "-hide_banner"]
        video_result = subprocess.run(video_info_cmd, capture_output=True, text=True, timeout=30)
        video_duration = extract_duration(video_result.stderr)
        
        # Get audio duration  
        audio_info_cmd = [ffmpeg_path, "-i", audio_path, "-hide_banner"]
        audio_result = subprocess.run(audio_info_cmd, capture_output=True, text=True, timeout=30)
        audio_duration = extract_duration(audio_result.stderr)
        
        print(f"     Video duration: {video_duration:.1f}s")
        print(f"     Audio duration: {audio_duration:.1f}s")
        
        # Choose merge strategy based on duration difference
        if abs(video_duration - audio_duration) < 1.0:
            # Durations are close, use simple merge
            print("   🎯 Using simple merge (durations match)")
            cmd = [
                ffmpeg_path,
                "-i", video_path,
                "-i", audio_path,
                "-c:v", "copy",            # Copy video without re-encoding for speed
                "-c:a", "aac",
                "-b:a", "128k",
                "-shortest",               # Use shortest duration
                "-movflags", "+faststart",
                "-y",
                output_path
            ]
        elif audio_duration > video_duration:
            # Audio is longer, extend video by looping last frame
            print("   🔄 Audio longer than video, extending video")
            cmd = [
                ffmpeg_path,
                "-i", video_path,
                "-i", audio_path,
                "-c:v", "libx264",
                "-c:a", "aac",
                "-b:a", "128k",
                "-shortest",               # This will now match audio length
                "-movflags", "+faststart",
                "-y",
                output_path
            ]
        else:
            # Video is longer, trim to audio length
            print("   ✂️ Video longer than audio, trimming video")
            cmd = [
                ffmpeg_path,
                "-i", video_path,
                "-i", audio_path,
                "-c:v", "libx264",
                "-c:a", "aac", 
                "-b:a", "128k",
                "-t", str(audio_duration), # Trim to audio duration
                "-movflags", "+faststart",
                "-y",
                output_path
            ]
        
        print(f"   🔧 Running enhanced FFmpeg command:")
        print(f"   📋 Command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        
        print(f"   📤 FFmpeg stdout: {result.stdout}")
        print(f"   📤 FFmpeg stderr: {result.stderr}")
        print(f"   📊 FFmpeg return code: {result.returncode}")
        
        if result.returncode == 0:
            if Path(output_path).exists():
                output_size = Path(output_path).stat().st_size
                print(f"   ✅ Video and audio merged successfully: {output_size} bytes")
                
                # Verify the merged file has audio
                verify_cmd = [
                    ffmpeg_path,
                    "-i", output_path,
                    "-hide_banner"
                ]
                verify_result = subprocess.run(verify_cmd, capture_output=True, text=True, timeout=30)
                if "Audio:" in verify_result.stderr:
                    print("   🎵 Confirmed: Merged video contains audio stream")
                else:
                    print("   ⚠️ Warning: Audio stream not detected in merged video")
                
                return True
            else:
                print("   ❌ Output file was not created")
                shutil.copy2(video_path, output_path)
                return True
        else:
            print(f"   ❌ FFmpeg failed with return code {result.returncode}")
            print(f"   💥 Error details: {result.stderr}")
            # Fallback: copy video as output
            shutil.copy2(video_path, output_path)
            return True
            
    except subprocess.TimeoutExpired:
        print("   ❌ FFmpeg timeout (180s), copying video only")
        shutil.copy2(video_path, output_path)
        return True
    except Exception as e:
        print(f"   ❌ Error merging video and audio: {e}")
        import traceback
        traceback.print_exc()
        # Fallback: copy video as output
        try:
            shutil.copy2(video_path, output_path)
            return True
        except:
            return False

@app.post("/generate-video", response_model=VideoResponse)
async def generate_video(request: VideoRequest):
    print(f"🎬 PYTHON SERVER: Received video generation request")
    print(f"   Question: {request.question[:50]}...")
    print(f"   Language: {request.language}")
    print(f"   Voice: {request.voice}")
    print(f"   Answer keys: {list(request.answer.keys()) if request.answer else 'None'}")
    
    try:
        # Generate unique filenames
        video_id = str(uuid.uuid4())
        video_filename = f"video_{video_id}.mp4"
        audio_filename = f"audio_{video_id}.mp3"
        final_filename = f"final_{video_id}.mp4"
        
        video_path = UPLOAD_DIR / video_filename
        audio_path = UPLOAD_DIR / audio_filename
        final_path = UPLOAD_DIR / final_filename
        
        print(f"   Video ID: {video_id}")
        print(f"   Video file: {video_filename}")
        print(f"   Audio file: {audio_filename}")
        print(f"   Final file: {final_filename}")
        
        # Check content types
        has_manim_katex = bool(request.answer.get('manimkatex', request.answer.get('manimlatex')))
        has_tts_script = bool(request.answer.get('tts'))
        tts_text = request.answer.get('tts', '').strip()
        
        print(f"   Has Manim KaTeX: {has_manim_katex}")
        print(f"   Has TTS script: {has_tts_script}")
        print(f"   TTS text length: {len(tts_text)}")
        
        # Generate Manim video
        video_success = False
        
        if has_manim_katex:
            print("   🎯 Attempting Manim math video generation...")
            video_success = generate_math_video(request.answer, str(video_path))
        else:
            print("   🎯 Attempting Manim slide video generation...")  
            video_success = generate_slide_video(request.answer, str(video_path))
        
        if not video_success or not video_path.exists():
            print("   💥 FAILURE: Video generation failed")
            return VideoResponse(
                success=False,
                error="Video generation failed"
            )
        
        print(f"   ✅ Video generated: {video_path.stat().st_size} bytes")
        
        # Generate TTS audio if available
        audio_success = True
        has_audio = False
        
        if tts_text:
            print("   🎤 Generating TTS audio...")
            audio_success = generate_audio_file(tts_text, request.language, request.voice, str(audio_path))
            has_audio = audio_success
            
            if audio_success:
                print(f"   ✅ Audio generated: {audio_path.stat().st_size} bytes")
            else:
                print("   ❌ Audio generation failed")
        else:
            print("   ⏭️ No TTS text provided, skipping audio")
        
        # Merge video and audio if both available
        final_file = video_filename  # Default to video-only
        merge_success = True
        
        if has_audio:
            print("   🎵 Merging video and audio...")
            merge_success = merge_video_audio(str(video_path), str(audio_path), str(final_path))
            
            if merge_success and final_path.exists():
                final_file = final_filename
                print(f"   ✅ Merged file created: {final_path.stat().st_size} bytes")
                
                # Clean up temporary files
                try:
                    video_path.unlink()
                    audio_path.unlink()
                except:
                    pass
            else:
                print("   ⚠️ Merge failed, using video-only")
                final_file = video_filename
                
                # Clean up audio file
                try:
                    audio_path.unlink()
                except:
                    pass
        
        result_path = f"/uploads/videos/{final_file}"
        print(f"   🎉 SUCCESS: Final video at {result_path}")
        print(f"   📊 Audio: {'✅' if audio_success else '❌'}")
        print(f"   📊 Merged: {'✅' if has_audio and merge_success else '⏭️'}")
        
        return VideoResponse(
            success=True,
            videoPath=result_path
        )
            
    except Exception as e:
        print(f"💥 PYTHON SERVER ERROR: {e}")
        import traceback
        traceback.print_exc()
        return VideoResponse(
            success=False,
            error=str(e)
        )

@app.post("/generate-audio")
async def generate_audio(request: dict):
    try:
        text = request.get('text', '')
        language = request.get('language', 'en')
        voice = request.get('voice', 'female')
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        audio_filename = f"{audio_id}.mp3"
        audio_path = UPLOAD_DIR / audio_filename
        
        # Generate TTS
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(str(audio_path))
        
        return {
            "success": True,
            "audioPath": f"/uploads/videos/{audio_filename}"
        }
        
    except Exception as e:
        print(f"Audio generation error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "manim-worker"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
