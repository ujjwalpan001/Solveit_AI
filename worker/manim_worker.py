import os
import sys
import json
import uuid
import asyncio
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
        
    def construct(self):
        # Title
        title = Text("Mathematical Solution", font_size=40, color=BLUE).to_edge(UP)
        self.play(Write(title))
        self.wait(1)
        
        if not self.katex_content:
            # Fallback for no KaTeX content
            no_content = Text("No mathematical content available", font_size=24, color=WHITE)
            no_content.move_to(ORIGIN)
            self.play(Write(no_content))
            self.wait(2)
            return
        
        try:
            # Split KaTeX content by double backslashes for step-by-step animation
            katex_steps = self.katex_content.split('\\\\')
            
            # Clean and prepare each step
            cleaned_steps = []
            for step in katex_steps:
                cleaned_step = step.strip()
                if cleaned_step:
                    cleaned_steps.append(cleaned_step)
            
            print(f"   📊 Processing {len(cleaned_steps)} KaTeX steps")
            
            current_y = 2
            previous_equations = []
            
            for i, katex_step in enumerate(cleaned_steps):
                print(f"   📐 Step {i+1}: {katex_step[:50]}...")
                
                try:
                    # Create MathTex object for this step
                    if katex_step.startswith('\\text{'):
                        # Handle text annotations
                        math_obj = MathTex(katex_step, font_size=32, color=YELLOW)
                    else:
                        # Handle mathematical equations
                        math_obj = MathTex(katex_step, font_size=36, color=WHITE)
                    
                    math_obj.move_to([0, current_y, 0])
                    
                    # Animate the appearance of this step
                    self.play(Write(math_obj), run_time=1.5)
                    self.wait(1)
                    
                    previous_equations.append(math_obj)
                    current_y -= 0.8
                    
                    # If we're running out of space, clear previous equations
                    if current_y < -2.5 and i < len(cleaned_steps) - 3:
                        self.play(*[FadeOut(eq) for eq in previous_equations[:-1]])
                        previous_equations = [previous_equations[-1]]  # Keep the last one
                        current_y = 1
                        
                except Exception as step_error:
                    print(f"   ❌ Error rendering step {i+1}: {step_error}")
                    # Fallback to text for problematic KaTeX
                    fallback_text = Text(f"Step {i+1}: {katex_step}", font_size=24, color=RED)
                    fallback_text.move_to([0, current_y, 0])
                    self.play(Write(fallback_text))
                    self.wait(1)
                    current_y -= 0.6
            
            self.wait(3)
            
        except Exception as e:
            print(f"   ❌ Error in MathAnimationScene construction: {e}")
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
    def __init__(self, steps: List[Dict], **kwargs):
        super().__init__(**kwargs)
        self.steps = steps
        
    def construct(self):
        title = Text("Solution", font_size=48, color=BLUE).to_edge(UP)
        self.play(Write(title))
        self.wait(1)
        
        for i, step in enumerate(self.steps):
            # Clear previous content (except title)
            if i > 0:
                self.play(FadeOut(*[mob for mob in self.mobjects if mob != title]))
            
            content = step['content']
            
            if step['type'] == 'code':
                # Display code with syntax highlighting effect
                code_lines = content.split('\n')
                code_group = VGroup()
                
                for j, line in enumerate(code_lines[:10]):  # Limit to 10 lines
                    code_text = Text(line, font="Courier", font_size=20, color=GREEN)
                    code_text.move_to([0, 2 - j * 0.4, 0])
                    code_group.add(code_text)
                
                self.play(Write(code_group))
                self.wait(3)
                
            else:
                # Split text into slides
                lines = self.split_text(content, 60)
                slide_group = VGroup()
                
                for j, line in enumerate(lines[:8]):  # Limit to 8 lines per slide
                    text = Text(line, font_size=28, color=WHITE)
                    text.move_to([0, 2 - j * 0.5, 0])
                    slide_group.add(text)
                
                self.play(Write(slide_group))
                self.wait(3)
        
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
    """Generate video for math problems using Manim with proper LaTeX"""
    try:
        print("   🎬 Starting Manim math video generation...")
        
        # Extract Manim KaTeX and TTS script from structured data
        katex_content = answer_data.get('manimkatex', answer_data.get('manimlatex', ''))
        tts_script = answer_data.get('tts', '')
        
        print(f"   📐 KaTeX content length: {len(katex_content)} characters")
        print(f"   🎤 TTS script length: {len(tts_script)} characters")
        
        if not katex_content:
            print("   ❌ No KaTeX content provided")
            return False
        
        # Configure Manim
        from manim import config as manim_config
        manim_config.media_dir = str(UPLOAD_DIR)
        manim_config.video_dir = str(UPLOAD_DIR)
        manim_config.quality = "medium_quality"
        manim_config.fps = 30
        
        print("   🎥 Creating Manim scene...")
        
        # Create scene with KaTeX content
        scene = MathAnimationScene(katex_content, tts_script)
        
        print("   🎬 Rendering Manim scene...")
        scene.render()
        
        # Find the rendered video file
        rendered_files = list(UPLOAD_DIR.glob("MathAnimationScene*.mp4"))
        if rendered_files:
            # Move the most recent file to the target path
            latest_file = max(rendered_files, key=lambda x: x.stat().st_mtime)
            latest_file.rename(output_path)
            print(f"   ✅ Manim video rendered successfully: {Path(output_path).stat().st_size} bytes")
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
    """Generate slide-style video using Manim SlideAnimationScene"""
    try:
        print("   🎬 Starting Manim slide video generation...")
        
        # Convert structured answer to steps format
        steps = answer_data.get('steps', [])
        if not steps:
            steps = [{'type': 'text', 'content': answer_data.get('text', 'No content available')}]
        
        # Configure Manim
        from manim import config as manim_config
        manim_config.media_dir = str(UPLOAD_DIR)
        manim_config.video_dir = str(UPLOAD_DIR)
        manim_config.quality = "medium_quality"
        manim_config.fps = 30
        
        print("   🎥 Creating Manim slide scene...")
        
        # Create scene with steps
        scene = SlideAnimationScene(steps)
        
        print("   🎬 Rendering Manim slide scene...")
        scene.render()
        
        # Find the rendered video file
        rendered_files = list(UPLOAD_DIR.glob("SlideAnimationScene*.mp4"))
        if rendered_files:
            # Move the most recent file to the target path
            latest_file = max(rendered_files, key=lambda x: x.stat().st_mtime)
            latest_file.rename(output_path)
            print(f"   ✅ Manim slide video rendered successfully: {Path(output_path).stat().st_size} bytes")
            return True
        else:
            print("   ❌ No rendered video file found")
            return False
        
    except Exception as e:
        print(f"   ❌ Error in slide video generation: {e}")
        import traceback
        traceback.print_exc()
        return False

@app.post("/generate-video", response_model=VideoResponse)
async def generate_video(request: VideoRequest):
    print(f"🎬 PYTHON SERVER: Received video generation request")
    print(f"   Question: {request.question[:50]}...")
    print(f"   Language: {request.language}")
    print(f"   Voice: {request.voice}")
    print(f"   Answer keys: {list(request.answer.keys()) if request.answer else 'None'}")
    
    try:
        # Generate unique filename
        video_id = str(uuid.uuid4())
        video_filename = f"{video_id}.mp4"
        video_path = UPLOAD_DIR / video_filename
        
        print(f"   Video ID: {video_id}")
        print(f"   Output path: {video_path}")
        
        # Check if we have structured Manim data
        has_manim_katex = bool(request.answer.get('manimkatex', request.answer.get('manimlatex')))
        has_tts_script = bool(request.answer.get('tts'))
        
        print(f"   Has Manim KaTeX: {has_manim_katex}")
        print(f"   Has TTS script: {has_tts_script}")
        
        # Try Manim generation based on content type
        success = False
        
        if has_manim_katex:
            # Use math video generation for KaTeX content
            print("   🎯 Attempting Manim math video generation...")
            success = generate_math_video(request.answer, str(video_path))
        else:
            # Use slide animation for other content
            print("   🎯 Attempting Manim slide video generation...")  
            success = generate_slide_video(request.answer, str(video_path))
        
        print(f"   📁 Video file exists: {video_path.exists()}")
        print(f"   ✅ Manim generation success: {success}")
        
        if success and video_path.exists():
            result_path = f"/uploads/videos/{video_filename}"
            print(f"   🎉 SUCCESS: Video generated at {result_path}")
            return VideoResponse(
                success=True,
                videoPath=result_path
            )
        else:
            print("   💥 FAILURE: Manim video generation failed")
            return VideoResponse(
                success=False,
                error="Manim video generation failed"
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
