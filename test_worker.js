const axios = require('axios');

async function testWorkerDirectly() {
    console.log('🧪 Testing Manim worker directly...');
    
    const testData = {
        question: 'What is a quadratic equation?',
        answer: {
            ans: 'A quadratic equation is a polynomial equation of degree 2.',
            manimkatex: `from manim import *

class QuadraticExample(Scene):
    def construct(self):
        title = Text("Quadratic Equation", font_size=40)
        self.play(Write(title))
        self.wait(1)
        
        equation = MathTex("ax^2 + bx + c = 0")
        equation.move_to(ORIGIN)
        self.play(Write(equation))
        self.wait(2)
        
        self.play(FadeOut(title), FadeOut(equation))`,
            tts: 'A quadratic equation is a polynomial equation of degree 2 [PAUSE 1]. It has the general form a x squared plus b x plus c equals zero [PAUSE 2].'
        },
        language: 'en',
        voice: 'female'
    };
    
    try {
        const response = await axios.post('http://localhost:8000/generate-video', testData);
        console.log('✅ Worker response received');
        console.log('📊 Response:', response.data);
        
        if (response.data.success) {
            console.log('🎉 Video generation successful!');
            console.log('📹 Video path:', response.data.videoPath);
        } else {
            console.log('❌ Video generation failed:', response.data.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('📊 Error response:', error.response.status, error.response.data);
        }
    }
}

testWorkerDirectly();
