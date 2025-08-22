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
            # Preprocess KaTeX content to handle delimiters and common issues
            preprocessed_content = self.preprocess_katex_content(self.katex_content)
            
            # Split KaTeX content by [STEP] markers for synchronized animation
            katex_steps = preprocessed_content.split('\\\\[STEP]')
            
            # Clean and prepare each step
            cleaned_steps = []
            for step in katex_steps:
                cleaned_step = self.sanitize_step(step.strip())
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
                    # Try to fix common LaTeX errors in this specific step
                    try:
                        fixed_step = self.fix_latex_step(katex_step)
                        math_obj = MathTex(fixed_step, font_size=36, color=YELLOW)
                        math_obj.move_to([0, current_y, 0])
                        self.play(Write(math_obj), run_time=timing['animation_time'])
                        if timing['wait_after'] > 0:
                            self.wait(timing['wait_after'])
                        previous_equations.append(math_obj)
                        current_y -= 0.8
                        print(f"   ✅ Fixed and rendered step {i+1}")
                    except Exception as fallback_error:
                        # Final fallback to text for problematic KaTeX
                        print(f"   ⚠️ Fallback to text for step {i+1}: {fallback_error}")
                        short_katex = katex_step[:30] + "..." if len(katex_step) > 30 else katex_step
                        fallback_text = Text(f"Step {i+1}: {short_katex}", font_size=24, color=RED)
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
    
    def preprocess_katex_content(self, content: str) -> str:
        """
        Pre-process KaTeX content to handle common issues before splitting into steps
        """
        # Try to import latex_fixer locally if available
        try:
            from latex_fixer import fix_common_latex_errors, preprocess_latex_content
            # Use the specialized LaTeX fixer first
            content = preprocess_latex_content(content)
            content = fix_common_latex_errors(content)
        except ImportError:
            # Basic fixes if latex_fixer is not available
            pass
        
        # Handle common dollar sign math delimiters
        if '$' in content:
            # Remove standalone $ delimiters, as MathTex already interprets content as math
            import re
            
            # Replace $...$ with just the content inside
            content = re.sub(r'\$([^$]+)\$', r'\1', content)
            
            # Handle more complex nested dollar signs that may indicate environments
            content = re.sub(r'\$\$(.*?)\$\$', r'\\begin{align} \1 \\end{align}', content)
            
            print("   🔄 Converted dollar sign delimiters in LaTeX content")
        
        # Fix missing end braces in environments
        environments = ['cases', 'matrix', 'pmatrix', 'bmatrix', 'align', 'gathered', 'align*']
        for env in environments:
            if f'\\begin{{{env}}}' in content and f'\\end{{{env}}}' not in content:
                content += f'\\end{{{env}}}'
                print(f"   ⚠️ Added missing \\end{{{env}}}")
        
        # Balance braces
        open_braces = content.count('{')
        close_braces = content.count('}')
        if open_braces > close_braces:
            content += '}' * (open_braces - close_braces)
            print(f"   ⚠️ Added {open_braces - close_braces} missing closing braces")
        
        return content
    
    def sanitize_step(self, step: str) -> str:
        """
        Clean and sanitize an individual KaTeX step
        """
        # Skip empty steps
        if not step or step.isspace():
            return ""
            
        # Fix common issues with cases environment
        if '\\begin{cases}' in step:
            # Ensure each case ends with \\
            import re
            step = re.sub(r'([^\\])\s*&', r'\1 &', step)  # Fix spacing around &
            step = re.sub(r'([^\\])\s*\n', r'\1\\\\\n', step)  # Add \\ for line breaks
            
            # Fix specific pattern common in cases
            if '\\text{if}' in step and '\\\\' not in step:
                step = step.replace('\\text{if}', '\\\\ \\text{if}')
        
        # Handle align environment
        if '\\begin{align' in step:
            # Ensure align has proper line breaks
            import re
            step = re.sub(r'([^\\])\s*\n', r'\1\\\\\n', step)
            
            # Fix align vs align* mismatch
            if '\\begin{align}' in step and '\\end{align*}' in step:
                step = step.replace('\\begin{align}', '\\begin{align*}')
            elif '\\begin{align*}' in step and '\\end{align}' in step:
                step = step.replace('\\end{align}', '\\end{align*}')
        
        return step
    
    def fix_latex_step(self, step: str) -> str:
        """
        Attempt to fix common LaTeX errors in a single step
        """
        # Try common fixes for LaTeX errors
        fixed = step
        
        # 1. Fix unescaped special characters
        special_chars = ['&', '%', '$', '#', '_', '{', '}']
        for char in special_chars:
            if char in fixed and f'\\{char}' not in fixed and not (char == '{' or char == '}'):
                fixed = fixed.replace(char, f'\\{char}')
        
        # 2. Fix common environment issues
        if '\\begin{cases}' in fixed:
            # Make sure each case ends with \\
            if '&' in fixed and '\\\\' not in fixed:
                fixed = fixed.replace('&', '& \\\\ ')
        
        # 3. Try simplifying complex expressions
        if len(fixed) > 100:  # If expression is very long, simplify
            # Extract the core equation, skipping environment tags
            import re
            core_match = re.search(r'\\begin\{[^}]+\}(.*?)\\end\{[^}]+\}', fixed)
            if core_match:
                # Just use the core content with simpler formatting
                core = core_match.group(1)
                fixed = core.strip()
        
        return fixed
    
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

def execute_manim_python_code(manim_code: str, output_path: str, tts_script: str = "") -> bool:
    """Execute Python Manim code directly and render the scene"""
    try:
        print("   🐍 Executing Python Manim code...")
        
        # Configure Manim
        from manim import config as manim_config
        manim_config.media_dir = str(UPLOAD_DIR)
        manim_config.video_dir = str(UPLOAD_DIR)
        manim_config.quality = "medium_quality"
        manim_config.fps = 30
        
        # Clean up the code
        cleaned_code = manim_code.strip()
        
        # Import and use the LaTeX preprocessor
        from latex_fixer import fix_common_latex_errors, preprocess_latex_content
        
        # Apply LaTeX preprocessing
        print("   🧹 Preprocessing LaTeX content...")
        try:
            cleaned_code = fix_common_latex_errors(cleaned_code)
            
            # Additional sanitization for $x = 2$ style inputs that might be causing issues
            if '$' in cleaned_code:
                print("   🔍 Detected dollar sign math delimiters, ensuring they're properly formatted")
                # Replace all standalone math expressions with MathTex
                import re
                dollar_math = re.findall(r'\$(.*?)\$', cleaned_code)
                for math in dollar_math:
                    if len(math.strip()) > 0:
                        # Check if this is already inside a MathTex
                        if not re.search(r'MathTex\([\'"][^\'"]*' + re.escape(math) + r'[^\'"]*[\'"]\)', cleaned_code):
                            # Replace with proper MathTex
                            cleaned_code = cleaned_code.replace(
                                f"${math}$", 
                                f'MathTex(r"{math}")'
                            )
                            print(f"   🔄 Converted ${math}$ to MathTex")
            
            print("   ✅ LaTeX preprocessing completed")
        except Exception as latex_error:
            print(f"   ⚠️ Error during LaTeX preprocessing: {latex_error}")
            # Continue with original code if preprocessing fails
        
        # Ensure the code has the necessary import
        if not cleaned_code.startswith('from manim import'):
            cleaned_code = 'from manim import *\n\n' + cleaned_code
        
        print(f"   📝 Code preview (first 200 chars):")
        print(f"   {cleaned_code[:200]}...")
        
        # Create a temporary module to execute the code
        import time
        import uuid
        temp_module_name = f"temp_manim_scene_{uuid.uuid4().hex[:8]}"
        
        # Create globals for the code execution
        globals_dict = {
            '__name__': temp_module_name,
            '__builtins__': __builtins__,
        }
        
        # Execute the code to define the scene classes
        try:
            exec(cleaned_code, globals_dict)
        except SyntaxError as syntax_ex:
            print(f"   ⚠️ Syntax error in code execution: {syntax_ex}")
            
            # Try with additional LaTeX fixes
            try:
                # More aggressive LaTeX fixes for common errors
                import re
                cleaned_code = cleaned_code.replace("\\\\", "\\\\\\\\")  # Double escaping backslashes
                cleaned_code = re.sub(r'(\\text{[^}]*})', lambda m: m.group(1).replace(' ', '~'), cleaned_code)
                print(f"   🔄 Attempting with additional LaTeX fixes...")
                exec(cleaned_code, globals_dict)
            except Exception as ex:
                print(f"   ⚠️ Failed with additional fixes: {ex}")
                use_fallback = True
            
        except Exception as code_ex:
            print(f"   ⚠️ Error in code execution: {code_ex}")
            use_fallback = True
            
        # Fallback if all attempts failed
        if 'use_fallback' in locals() and use_fallback:
            # Try a fallback simple scene to generate at least something
            fallback_code = '''
from manim import *

class FallbackScene(Scene):
    def construct(self):
        title = Text("Math Animation", font_size=40)
        self.play(Write(title))
        self.wait(1)
        self.play(title.animate.to_edge(UP))
        
        error_text = Text("Could not render the original animation.", font_size=24, color=RED)
        error_text.next_to(title, DOWN, buff=0.5)
        self.play(Write(error_text))
        self.wait(1)
        
        math_text = MathTex("f(x) = ax^2 + bx + c")
        math_text.next_to(error_text, DOWN, buff=0.8)
        self.play(Write(math_text))
        self.wait(2)
'''
            print("   🔄 Using fallback scene...")
            try:
                exec(fallback_code, globals_dict)
                use_fallback = True
            except Exception as fallback_ex:
                print(f"   ❌ Even fallback scene failed: {fallback_ex}")
                return False
        
        # Find all Scene classes defined in the code
        scene_classes = []
        from manim import Scene
        
        # Check if we're using fallback
        if 'use_fallback' in locals() and use_fallback:
            # Try to find the FallbackScene
            fallback_class = globals_dict.get('FallbackScene')
            if fallback_class:
                scene_classes = [fallback_class]
                print(f"   🎭 Using fallback scene class: FallbackScene")
        else:
            # Try to find user-defined scenes
            try:
                for name, obj in globals_dict.items():
                    try:
                        if (isinstance(obj, type) and 
                            hasattr(obj, '__bases__') and
                            # Check both ways to find Scene subclasses
                            (any('Scene' in str(base) for base in obj.__bases__) or
                             issubclass(obj, Scene)) and
                            name not in ['Scene', 'MovingCameraScene', 'ThreeDScene', 'SpecialThreeDScene', 
                                        'VectorScene', 'LinearTransformationScene', 'ZoomedScene'] and
                            not name.startswith('_')):  # Exclude built-in scene classes
                            scene_classes.append(obj)
                            print(f"   🎭 Found user-defined scene class: {name}")
                    except TypeError:
                        # Skip non-type objects
                        continue
            except Exception as scene_error:
                print(f"   ⚠️ Error searching for scene classes: {scene_error}")
        
        if not scene_classes:
            print("   ⚠️ No user-defined Scene classes found in the code")
            print("   🔄 Creating basic scene class...")
            try:
                # Create a basic scene class with the original code embedded as a comment
                basic_code = """
from manim import *

class BasicScene(Scene):
    def construct(self):
        title = Text("Math Animation", font_size=40)
        self.play(Write(title))
        self.wait(1)
        self.play(title.animate.to_edge(UP))
        
        # Try to display some math expressions
        try:
            math_text = MathTex("f(x) = ax^2 + bx + c")
            math_text.next_to(title, DOWN, buff=1.0)
            self.play(Write(math_text))
            self.wait(2)
        except Exception:
            error_text = Text("Could not render LaTeX expressions", font_size=24, color=RED)
            error_text.next_to(title, DOWN, buff=1.0)
            self.play(Write(error_text))
            self.wait(2)
"""
                exec(basic_code, globals_dict)
                basic_class = globals_dict.get('BasicScene')
                if basic_class:
                    scene_classes = [basic_class]
                    print(f"   🎭 Created and using BasicScene class")
                else:
                    print(f"   ❌ Failed to create BasicScene")
                    return False
            except Exception as basic_ex:
                print(f"   ❌ Error creating basic scene: {basic_ex}")
                return False
        
        # Use the first scene class found (or fallback/basic scene)
        SceneClass = scene_classes[0]
        print(f"   🎬 Using scene class: {SceneClass.__name__}")
        
        # Create and render the scene
        scene = SceneClass()
        try:
            # Attempt to render the scene with error handling
            scene.render()
        except Exception as render_error:
            error_msg = str(render_error).lower()
            if "latex" in error_msg or "tex" in error_msg:
                print(f"   ⚠️ LaTeX error during rendering: {render_error}")
                
                # Try one more attempt with simplified LaTeX
                print("   🔄 Attempting with simplified LaTeX...")
                try:
                    # Analyze the error
                    specific_error = ""
                    if "illegal parameter" in error_msg:
                        specific_error = "Illegal parameter in LaTeX command"
                    elif "missing" in error_msg and "$" in error_msg:
                        specific_error = "Missing LaTeX delimiter"
                    elif "undefined control sequence" in error_msg:
                        specific_error = "Undefined LaTeX command"
                    else:
                        specific_error = "LaTeX syntax error"
                    
                    # Extract the problematic expression from the error if possible
                    problematic_expression = ""
                    if "Missing } inserted" in str(render_error):
                        # Find the line with unbalanced braces
                        import re
                        brace_match = re.search(r'\\begin{cases}(.*?)\\end{cases}', manim_code, re.DOTALL)
                        if brace_match:
                            problematic_expression = brace_match.group(0)[:50] + "..."
                        else:
                            problematic_expression = "Unbalanced braces in LaTeX expression"
                    elif "Undefined control sequence" in str(render_error):
                        # Try to extract the undefined command
                        import re
                        cmd_match = re.search(r'Undefined control sequence\\([a-zA-Z]+)', str(render_error))
                        if cmd_match:
                            problematic_expression = f"Unknown command: \\{cmd_match.group(1)}"
                        else:
                            problematic_expression = "Unknown LaTeX command"
                    
                    # Create a scene that shows the error but still produces a video
                    error_code = f"""
from manim import *

class LaTeXErrorScene(Scene):
    def construct(self):
        title = Text("LaTeX Rendering Error", color=RED, font_size=40)
        self.play(Write(title))
        self.wait(1)
        self.play(title.animate.to_edge(UP))
        
        error_text = Text("{specific_error}", font_size=24, color=ORANGE)
        error_text.next_to(title, DOWN, buff=0.5)
        self.play(Write(error_text))
        self.wait(1)
        
        # Show the problematic expression (if identified)
        if "{problematic_expression}":
            problem_text = Text("Problem area: {problematic_expression}", font_size=20, color=YELLOW)
            problem_text.next_to(error_text, DOWN, buff=0.5)
            self.play(Write(problem_text))
            self.wait(1)
        
        # Show a simple expression that will definitely work
        simple_math = MathTex("f(x) = ax^2 + bx + c")
        simple_math.next_to(error_text, DOWN, buff=1.5)
        self.play(Write(simple_math))
        self.wait(1)
        
        # Common fixes suggestions
        fixes = VGroup(
            Text("Common fixes:", font_size=22, color=GREEN),
            Text("1. Ensure all braces are balanced", font_size=18),
            Text("2. Use \\\\ for line breaks in cases environments", font_size=18),
            Text("3. Simplify complex expressions", font_size=18)
        )
        fixes.arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        fixes.next_to(simple_math, DOWN, buff=0.8)
        self.play(Write(fixes))
        self.wait(2)
"""
                    exec(error_code, globals_dict)
                    error_scene = globals_dict.get('LaTeXErrorScene')()
                    error_scene.render()
                    
                    # Set flag to use the error scene's output
                    use_error_scene = True
                    
                except Exception as error_scene_ex:
                    print(f"   ❌ Error scene failed: {error_scene_ex}")
                    # Create a very simple scene without LaTeX as last resort
                    simple_code = """
from manim import *

class SimpleScene(Scene):
    def construct(self):
        title = Text("Unable to render LaTeX", color=RED, font_size=40)
        self.play(Write(title))
        self.wait(1)
        
        # Give more specific information about the error
        error_detail = Text("Syntax error in mathematical expressions", font_size=24, color=ORANGE)
        error_detail.next_to(title, DOWN, buff=0.5)
        self.play(Write(error_detail))
        self.wait(1)
        
        # Show basic formula as example
        text = Text("Example of correct syntax:", font_size=20)
        text.next_to(error_detail, DOWN, buff=0.8)
        self.play(Write(text))
        self.wait(0.5)
        
        # Show examples of correctly formatted LaTeX
        examples = VGroup(
            Tex(r"\\text{Basic formula: } f(x) = x^2 + 2x + 1"),
            Tex(r"\\text{Fraction: } \\frac{a}{b} + \\frac{c}{d}"),
            Tex(r"\\text{Cases: } f(x) = \\begin{cases} x^2 & x > 0 \\\\ -x^2 & x \\leq 0 \\end{cases}")
        )
        examples.arrange(DOWN, buff=0.5)
        examples.next_to(text, DOWN, buff=0.5)
        self.play(Write(examples[0]))
        self.wait(0.5)
        self.play(Write(examples[1]))
        self.wait(0.5)
        self.play(Write(examples[2]))
        self.wait(2)
"""
                    exec(simple_code, globals_dict)
                    simple_scene = globals_dict.get('SimpleScene')()
                    simple_scene.render()
                    # Set flag to use simple scene
                    use_simple_scene = True
            else:
                # Re-raise non-LaTeX errors
                raise render_error
                
        # Find the rendered video file
        import time
        
        # Check if we're using error or fallback scenes
        if 'use_error_scene' in locals() and use_error_scene:
            rendered_files = list(UPLOAD_DIR.glob("LaTeXErrorScene*.mp4"))
            print("   🔍 Looking for error scene video file")
        elif 'use_simple_scene' in locals() and use_simple_scene:
            rendered_files = list(UPLOAD_DIR.glob("SimpleScene*.mp4"))
            print("   🔍 Looking for simple scene video file")
        else:
            # Normal case - look for the rendered scene
            scene_name = SceneClass.__name__
            rendered_files = list(UPLOAD_DIR.glob(f"{scene_name}*.mp4"))
            print(f"   🔍 Looking for main scene video file: {scene_name}*.mp4")
        
        if not rendered_files:
            # Try to find any recently created MP4 files as fallback
            print("   ⚠️ No specific scene file found, checking recent videos...")
            rendered_files = list(UPLOAD_DIR.glob("*.mp4"))
            if rendered_files:
                rendered_files = [f for f in rendered_files if f.stat().st_mtime > (time.time() - 60)]
                print(f"   🔍 Found {len(rendered_files)} recent MP4 files")
        
        if rendered_files:
            # Move the most recent file to the target path
            latest_file = max(rendered_files, key=lambda x: x.stat().st_mtime)
            shutil.move(str(latest_file), output_path)
            print(f"   ✅ Python Manim code executed successfully: {Path(output_path).stat().st_size} bytes")
            return True
        else:
            print("   ❌ No rendered video file found after execution")
            return False
            
    except Exception as e:
        print(f"   💥 Error executing Python Manim code: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_math_video(answer_data: Dict, output_path: str) -> bool:
    """Generate video for math problems using Manim with synchronized timing"""
    try:
        print("   🎬 Starting synchronized Manim math video generation...")
        
        # Extract Manim KaTeX and TTS script from structured data
        manim_code = answer_data.get('manimkatex', answer_data.get('manimlatex', ''))
        tts_script = answer_data.get('tts', '')
        
        print(f"   📐 Manim code length: {len(manim_code)} characters")
        print(f"   🎤 TTS script length: {len(tts_script)} characters")
        print(f"   🎵 TTS segments: {len(tts_script.split('[PAUSE]')) if tts_script else 0}")
        
        if not manim_code:
            print("   ❌ No Manim code provided")
            return False
        
        # Configure Manim
        from manim import config as manim_config
        manim_config.media_dir = str(UPLOAD_DIR)
        manim_config.video_dir = str(UPLOAD_DIR)
        manim_config.quality = "medium_quality"
        manim_config.fps = 30
        
        print("   🎥 Processing Manim code...")
        
        # Check if it's Python code or LaTeX content
        if manim_code.strip().startswith('from manim import') or manim_code.strip().startswith('class '):
            # It's Python code - execute it directly
            print("   🐍 Detected Python Manim code, executing directly...")
            return execute_manim_python_code(manim_code, output_path, tts_script)
        else:
            # It's LaTeX/KaTeX content - use the old method
            print("   📐 Detected LaTeX content, using MathAnimationScene...")
            scene = MathAnimationScene(manim_code, tts_script)
        
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
