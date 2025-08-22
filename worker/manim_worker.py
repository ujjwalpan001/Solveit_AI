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
        # Video settings
        width, height = 1280, 720
        fps = 30
        duration_per_step = 3  # seconds
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
        
        # Background color (dark)
        bg_color = (30, 30, 30)
        
        for step in steps:
            content = step['content']
            
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
                    font = ImageFont.truetype("arial.ttf", 36)
                except:
                    font = ImageFont.load_default()
                
                # Split text into lines
                lines = content.split('\n')[:10]  # Limit lines
                
                y_offset = 100
                for line in lines:
                    if len(line) > 50:
                        # Split long lines
                        words = line.split()
                        current_line = ""
                        for word in words:
                            if len(current_line + word) < 50:
                                current_line += word + " "
                            else:
                                draw.text((50, y_offset), current_line.strip(), fill=(255, 255, 255), font=font)
                                y_offset += 50
                                current_line = word + " "
                        if current_line:
                            draw.text((50, y_offset), current_line.strip(), fill=(255, 255, 255), font=font)
                            y_offset += 50
                    else:
                        draw.text((50, y_offset), line, fill=(255, 255, 255), font=font)
                        y_offset += 50
                
                # Convert back to numpy array
                frame = np.array(pil_img)
                
                # Write frame
                out.write(frame)
        
        out.release()
        return True
        
    except Exception as e:
        print(f"Error generating simple video: {e}")
        return False

@app.post("/generate-video", response_model=VideoResponse)
async def generate_video(request: VideoRequest):
    try:
        # Generate unique filename
        video_id = str(uuid.uuid4())
        video_filename = f"{video_id}.mp4"
        video_path = UPLOAD_DIR / video_filename
        
        steps = request.answer.get('steps', [])
        if not steps:
            # Create a single step from the text
            steps = [{'type': 'text', 'content': request.answer.get('text', 'No content available')}]
        
        # Determine video type based on content
        has_math = any(step.get('type') == 'equation' for step in steps)
        has_code = any(step.get('type') == 'code' for step in steps)
        
        success = False
        
        if has_math:
            # Try Manim for math content
            try:
                success = generate_math_video(steps, str(video_path))
            except:
                print("Manim failed, falling back to simple video")
                success = generate_simple_video(steps, str(video_path))
        else:
            # Try slide animation for non-math content
            try:
                success = generate_slide_video(steps, str(video_path))
            except:
                print("Slide animation failed, falling back to simple video")
                success = generate_simple_video(steps, str(video_path))
        
        if success and video_path.exists():
            return VideoResponse(
                success=True,
                videoPath=f"/uploads/videos/{video_filename}"
            )
        else:
            raise HTTPException(status_code=500, detail="Video generation failed")
            
    except Exception as e:
        print(f"Video generation error: {e}")
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
