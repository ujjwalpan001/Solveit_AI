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

# TTS imports
from gtts import gTTS
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

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
    def __init__(self, steps: List[Dict], **kwargs):
        super().__init__(**kwargs)
        self.steps = steps
        
    def construct(self):
        title = Text("Solution", font_size=48, color=BLUE).to_edge(UP)
        self.play(Write(title))
        self.wait(1)
        
        current_y = 2
        
        for i, step in enumerate(self.steps):
            if step['type'] == 'equation':
                equation = MathTex(step['content'], font_size=36)
                equation.move_to([0, current_y, 0])
                self.play(Write(equation))
                self.wait(2)
                current_y -= 0.8
                
            elif step['type'] == 'text' or step['type'] == 'explanation':
                # Split long text into multiple lines
                lines = self.split_text(step['content'], 50)
                for line in lines:
                    text = Text(line, font_size=24, color=WHITE)
                    text.move_to([0, current_y, 0])
                    self.play(Write(text))
                    self.wait(1.5)
                    current_y -= 0.5
                    
            if current_y < -3:
                self.play(FadeOut(*self.mobjects))
                current_y = 2
        
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

def generate_math_video(steps: List[Dict], output_path: str) -> bool:
    """Generate video for math problems using Manim"""
    try:
        # Configure Manim
        config.media_dir = str(UPLOAD_DIR)
        config.video_dir = str(UPLOAD_DIR)
        config.quality = "medium_quality"
        config.fps = 30
        
        # Create scene
        scene = MathAnimationScene(steps)
        scene.render()
        
        # Move the rendered video to the specified path
        rendered_files = list(UPLOAD_DIR.glob("MathAnimationScene*.mp4"))
        if rendered_files:
            rendered_files.rename(output_path)
            return True
        
        return False
    except Exception as e:
        print(f"Error generating math video: {e}")
        return False

def generate_slide_video(steps: List[Dict], output_path: str) -> bool:
    """Generate slide-style video for non-math content"""
    try:
        # Configure Manim
        config.media_dir = str(UPLOAD_DIR)
        config.video_dir = str(UPLOAD_DIR)
        config.quality = "medium_quality"
        config.fps = 30
        
        # Create scene
        scene = SlideAnimationScene(steps)
        scene.render()
        
        # Move the rendered video to the specified path
        rendered_files = list(UPLOAD_DIR.glob("SlideAnimationScene*.mp4"))
        if rendered_files:
            rendered_files.rename(output_path)
            return True
        
        return False
    except Exception as e:
        print(f"Error generating slide video: {e}")
        return False

def generate_simple_video(steps: List[Dict], output_path: str) -> bool:
    """Generate simple video using OpenCV as fallback"""
    try:
        print("   🎬 Starting simple video generation...")
        
        # Video settings
        width, height = 1280, 720
        fps = 30
        duration_per_step = 4  # seconds
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
        
        if not out.isOpened():
            print("   ❌ Failed to open video writer")
            return False
        
        # Background color (dark blue)
        bg_color = (40, 40, 80)
        
        print(f"   📝 Processing {len(steps)} steps...")
        
        for step_idx, step in enumerate(steps):
            content = step.get('content', 'No content')
            step_type = step.get('type', 'text')
            
            print(f"   📄 Step {step_idx + 1}/{len(steps)}: {step_type}")
            
            # Create frames for this step
            frames_per_step = fps * duration_per_step
            
            for frame_num in range(frames_per_step):
                # Create background
                frame = np.full((height, width, 3), bg_color, dtype=np.uint8)
                
                # Convert to PIL for text rendering
                pil_img = Image.fromarray(frame)
                draw = ImageDraw.Draw(pil_img)
                
                # Try to load a font
                try:
                    # Try different font sizes based on content length
                    font_size = 32 if len(content) < 100 else 28 if len(content) < 200 else 24
                    font = ImageFont.truetype("arial.ttf", font_size)
                except:
                    try:
                        font = ImageFont.load_default()
                    except:
                        print("   ⚠️ Using basic font rendering")
                        font = None
                
                # Add title
                title = f"Step {step_idx + 1}: {step_type.title()}"
                if font:
                    draw.text((50, 50), title, fill=(255, 255, 100), font=font)
                
                # Process content based on type
                if step_type == 'equation' or 'equation' in content.lower():
                    # Handle math equations
                    lines = [content]  # Keep equations on single line if possible
                    text_color = (100, 255, 100)  # Green for math
                else:
                    # Split text into manageable lines
                    lines = split_text_smart(content, 60)
                    text_color = (255, 255, 255)  # White for regular text
                
                y_offset = 120
                line_height = 40
                
                for line_idx, line in enumerate(lines[:15]):  # Limit to 15 lines
                    if not line.strip():
                        continue
                        
                    # Clean line of special characters that might cause issues
                    clean_line = clean_text_for_display(line)
                    
                    if font:
                        draw.text((50, y_offset), clean_line, fill=text_color, font=font)
                    y_offset += line_height
                    
                    if y_offset > height - 100:  # Leave space at bottom
                        break
                
                # Add progress indicator
                progress = (step_idx + 1) / len(steps)
                progress_width = int((width - 100) * progress)
                draw.rectangle([50, height - 50, 50 + progress_width, height - 40], 
                             fill=(100, 200, 255))
                
                # Convert back to numpy array
                frame = np.array(pil_img)
                
                # Write frame
                out.write(frame)
        
        out.release()
        
        # Verify file was created and has content
        if Path(output_path).exists() and Path(output_path).stat().st_size > 1000:
            print(f"   ✅ Simple video generated: {Path(output_path).stat().st_size} bytes")
            return True
        else:
            print(f"   ❌ Video file not created or too small")
            return False
        
    except Exception as e:
        print(f"   💥 Error generating simple video: {e}")
        import traceback
        traceback.print_exc()
        return False

    def split_text_smart(self, text: str, max_length: int) -> List[str]:
        """Smart text splitting that preserves words and handles special characters"""
        if not text:
            return [""]
            
        # Remove or replace problematic characters
        text = text.replace('\u2014', '-').replace('\u2013', '-')  # Em dash, en dash
        text = text.replace('\u201c', '"').replace('\u201d', '"')  # Smart quotes
        text = text.replace('\u2018', "'").replace('\u2019', "'")  # Smart apostrophes
        
        paragraphs = text.split('\n')
        lines = []
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                lines.append("")
                continue
                
            words = paragraph.split()
            current_line = ""
            
            for word in words:
                if len(current_line + " " + word) <= max_length:
                    current_line += (" " + word) if current_line else word
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            
            if current_line:
                lines.append(current_line)
        
        return lines if lines else [""]

    def clean_text_for_display(self, text: str) -> str:
        """Clean text for display, removing problematic characters"""
        if not text:
            return ""
            
        # Replace common problematic Unicode characters
        replacements = {
            '\u2014': '--',  # Em dash
            '\u2013': '-',   # En dash
            '\u201c': '"',   # Left double quote
            '\u201d': '"',   # Right double quote
            '\u2018': "'",   # Left single quote
            '\u2019': "'",   # Right single quote
            '\u2026': '...',  # Ellipsis
            '\u00a0': ' ',   # Non-breaking space
        }
        
        for unicode_char, replacement in replacements.items():
            text = text.replace(unicode_char, replacement)
        
        # Remove any remaining non-ASCII characters that might cause issues
        text = ''.join(char if ord(char) < 128 else '?' for char in text)
        
        return text

def split_text_smart(text: str, max_length: int) -> List[str]:
    """Smart text splitting that preserves words and handles special characters"""
    if not text:
        return [""]
        
    # Remove or replace problematic characters
    text = text.replace('\u2014', '-').replace('\u2013', '-')  # Em dash, en dash
    text = text.replace('\u201c', '"').replace('\u201d', '"')  # Smart quotes
    text = text.replace('\u2018', "'").replace('\u2019', "'")  # Smart apostrophes
    
    paragraphs = text.split('\n')
    lines = []
    
    for paragraph in paragraphs:
        if not paragraph.strip():
            lines.append("")
            continue
            
        words = paragraph.split()
        current_line = ""
        
        for word in words:
            if len(current_line + " " + word) <= max_length:
                current_line += (" " + word) if current_line else word
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)
    
    return lines if lines else [""]

def clean_text_for_display(text: str) -> str:
    """Clean text for display, removing problematic characters"""
    if not text:
        return ""
        
    # Replace common problematic Unicode characters
    replacements = {
        '\u2014': '--',  # Em dash
        '\u2013': '-',   # En dash
        '\u201c': '"',   # Left double quote
        '\u201d': '"',   # Right double quote
        '\u2018': "'",   # Left single quote
        '\u2019': "'",   # Right single quote
        '\u2026': '...',  # Ellipsis
        '\u00a0': ' ',   # Non-breaking space
    }
    
    for unicode_char, replacement in replacements.items():
        text = text.replace(unicode_char, replacement)
    
    # Remove any remaining non-ASCII characters that might cause issues
    text = ''.join(char if ord(char) < 128 else '?' for char in text)
    
    return text

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
        
        steps = request.answer.get('steps', [])
        if not steps:
            # Create a single step from the text
            steps = [{'type': 'text', 'content': request.answer.get('text', 'No content available')}]
        
        print(f"   Steps count: {len(steps)}")
        print(f"   Steps types: {[step.get('type', 'unknown') for step in steps]}")
        
        # Determine video type based on content
        has_math = any(step.get('type') == 'equation' for step in steps)
        has_code = any(step.get('type') == 'code' for step in steps)
        
        print(f"   Has math: {has_math}")
        print(f"   Has code: {has_code}")
        
        success = False
        
        if has_math:
            # Try Manim for math content
            print("   🎯 Attempting Manim math video generation...")
            try:
                success = generate_math_video(steps, str(video_path))
                print(f"   ✅ Manim math video: {success}")
            except Exception as e:
                print(f"   ❌ Manim failed: {e}")
                print("   🔄 Falling back to simple video")
                try:
                    success = generate_simple_video(steps, str(video_path))
                    print(f"   ✅ Simple video fallback: {success}")
                except Exception as fallback_error:
                    print(f"   ❌ Simple video fallback also failed: {fallback_error}")
                    success = False
        else:
            # Try slide animation for non-math content
            print("   🎯 Attempting slide animation generation...")
            try:
                success = generate_slide_video(steps, str(video_path))
                print(f"   ✅ Slide animation: {success}")
            except Exception as e:
                print(f"   ❌ Slide animation failed: {e}")
                print("   🔄 Falling back to simple video")
                try:
                    success = generate_simple_video(steps, str(video_path))
                    print(f"   ✅ Simple video fallback: {success}")
                except Exception as fallback_error:
                    print(f"   ❌ Simple video fallback also failed: {fallback_error}")
                    success = False
        
        print(f"   📁 Video file exists: {video_path.exists()}")
        
        if success and video_path.exists():
            result_path = f"/uploads/videos/{video_filename}"
            print(f"   🎉 SUCCESS: Video generated at {result_path}")
            return VideoResponse(
                success=True,
                videoPath=result_path
            )
        else:
            print("   💥 FAILURE: Video generation failed")
            raise HTTPException(status_code=500, detail="Video generation failed")
            
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
