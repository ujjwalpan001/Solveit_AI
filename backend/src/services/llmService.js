const axios = require('axios');

// Use Nebius API as primary provider
const nebiusToken = process.env.NEBIUS_API_KEY;

const generateAnswer = async (question, subject) => {
  try {
    console.log('LLM Service: Generating answer for question:', question, 'subject:', subject);
    
    const endpoint = "https://api.studio.nebius.ai/v1";
    const model = "meta-llama/Llama-3.3-70B-Instruct-fast";
    
    console.log('LLM Service: Using Nebius API with model:', model);
    const systemPrompt = getSystemPrompt(subject);
    
    const response = await axios.post(`${endpoint}/chat/completions`, {
      model: model,
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
      response_format: {
        "type": "json_schema",
        "json_schema": {
          "name": "educational_response_schema",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "ans": {
                "type": "string",
                "description": "The main educational answer with LaTeX formatting"
              },
              "manimkatex": {
                "type": "string",
                "description": "Manim animation code for visual representation"
              },
              "tts": {
                "type": "string",
                "description": "Text-to-speech optimized script with pause markers"
              }
            },
            "required": ["ans", "manimkatex", "tts"],
            "additionalProperties": false
          }
        }
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${nebiusToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('LLM Service: API response received');
    return processResponse(response.data.choices[0].message.content, subject);
    
  } catch (error) {
    console.error('LLM Service Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};

const processResponse = (answerText, subject) => {
  // Clean up the response by removing <think> tags and their content
  answerText = answerText.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
  
  console.log('LLM Service: Cleaned answer text (first 200 chars):', answerText.substring(0, 200));
  
  // Extract JSON from the response if it's wrapped in explanatory text
  let jsonText = answerText;
  
  // Look for JSON block between `````` or just { and }
  const jsonMatch = answerText.match(/``````/) || 
                   answerText.match(/(\{[\s\S]*\})/);
  
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
    console.log('LLM Service: Extracted JSON from wrapped response');
  }
  
  // Try to parse JSON response, fallback to old format if not JSON
  let structuredAnswer;
  try {
    structuredAnswer = JSON.parse(jsonText);
    console.log('LLM Service: Successfully parsed structured JSON response');
    console.log('LLM Service: JSON keys found:', Object.keys(structuredAnswer));
  } catch (e) {
    console.log('LLM Service: JSON parse failed, using fallback parsing');
    console.log('LLM Service: Parse error:', e.message);
    // Fallback to old parsing method
    const steps = parseAnswerIntoSteps(answerText, subject);
    structuredAnswer = {
      ans: answerText,
      manimkatex: null,
      tts: answerText,
      steps
    };
  }
  
  // Ensure all required fields exist
  const answer = {
    ans: structuredAnswer.ans || answerText, // Primary field for chat display
    text: structuredAnswer.ans || answerText, // Fallback for compatibility 
    manimkatex: structuredAnswer.manimkatex || structuredAnswer.manimlatex || null,
    tts: structuredAnswer.tts || structuredAnswer.ans || answerText,
    steps: structuredAnswer.steps || parseAnswerIntoSteps(structuredAnswer.ans || answerText, subject)
  };
  
  console.log('LLM Service: Final answer.ans (first 100 chars):', answer.ans?.substring(0, 100));
  return answer;
};

const getSystemPrompt = (subject) => {
  const basePrompt = `You are an expert AI tutor specializing in creating advanced educational animations with Manim. 

CRITICAL: Your response must be ONLY a valid JSON object with no additional text, explanations, or markdown formatting. Return exactly this structure:

{
  "ans": "Clear, step-by-step explanation for the user (use inline KaTeX for math: $x^2 + 1$, $$x = \\frac{-b}{2a}$$)",
  "manimkatex": "Complete Python code using Manim library to create detailed animated video explanations, including one or more classes that extend Scene, with advanced animations synchronized to TTS for longer, more engaging videos",
  "tts": "Script for text-to-speech that matches the video content with timing markers like [PAUSE 1] where the number indicates seconds to pause for sync with animations"
}

IMPORTANT: 
- Do not include any text before or after the JSON
- Do not wrap it in markdown code blocks
- Return only the raw JSON object
- Use double backslashes in LaTeX: \\\\frac{1}{2} not \\frac{1}{2}
- Properly escape all strings for JSON format

CRITICAL: Video and audio must be perfectly synchronized! Use self.wait(duration) in Manim code to match the total timing of [PAUSE duration] markers in TTS.

- For ans: Use KaTeX syntax for inline math $...$ and display math $$...$$. Provide a comprehensive textual explanation.
- For manimkatex: Write full, executable Python code with 'from manim import *' at the top. Define detailed Scene classes with construct method using advanced animations like Write, TransformMatchingTex, Create, FadeIn, Indicate, SurroundingRectangle, Brace, etc. Include geometric visualizations, multiple steps, highlights, and transitions for longer videos (aim for 30-60 seconds or more). Colorize elements, add titles, and build concepts progressively. If applicable, include multiple proof methods (e.g., algebraic and geometric) in separate or combined scenes.
- For tts: Create engaging narration with [PAUSE seconds] markers placed to sync exactly with visual animations and waits in the Manim code. Use variable pause durations (0.5 to 2 seconds) for emphasis and longer explanations.
- Always return valid JSON, and properly escape strings in the JSON (e.g., use \\n for newlines in code, \\\\ for backslashes in LaTeX).
- Do not include any explanatory text, markdown formatting, or code blocks around the JSON.
- Return ONLY the raw JSON object.`;
  
  const subjectSpecificPrompts = {
    math: `${basePrompt}

For mathematical problems:
- ans: Provide clear step-by-step solution with explanations using KaTeX syntax.
- manimkatex: Create advanced Manim code with synchronized animations. Include algebraic derivations, geometric proofs if possible, highlights, braces for emphasis, and boxing final results. Use TransformMatchingTex for smooth equation transitions, Indicate for highlighting, and geometric shapes for visual proofs to make longer, more detailed videos.
- tts: Create narration with [PAUSE seconds] markers that match animation timings exactly.

Example response for "Expand (x+y)^2":
{
  "ans": "To solve $(x+y)^2$, we can use algebraic expansion: $(x+y)^2 = (x+y)(x+y) = x(x+y) + y(x+y) = x^2 + xy + yx + y^2 = x^2 + 2xy + y^2$. Geometrically, it represents the area of a square with side x+y, divided into x^2, y^2, and two xy rectangles.",
  "manimkatex": "from manim import *\\n\\nclass AlgebraicWholeSquare(Scene):\\n    def construct(self):\\n        title = Tex(r\\"Algebraic derivation of $(x+y)^2$\\")\\n        self.play(Write(title))\\n        self.wait(0.5)\\n        self.play(title.animate.to_edge(UP))\\n\\n        def colorize(m: Mobject):\\n            m.set_color_by_tex(\\"x\\", BLUE)\\n            m.set_color_by_tex(\\"y\\", YELLOW)\\n            return m\\n\\n        step1 = colorize(MathTex(r\\"(x+y)^2 = (x+y)(x+y)\\"))\\n        step2 = colorize(MathTex(r\\"=\\\\ x(x+y)\\\\ +\\\\ y(x+y)\\"))\\n        step3 = colorize(MathTex(r\\"=\\\\ x^2 + xy + yx + y^2\\"))\\n        step4 = colorize(MathTex(r\\"=\\\\ x^2 + 2xy + y^2\\"))\\n\\n        steps = VGroup(step1, step2, step3, step4).arrange(DOWN, aligned_edge=LEFT, buff=0.5)\\n        steps.next_to(title, DOWN, buff=0.75).to_edge(LEFT, buff=1)\\n\\n        self.play(Write(step1))\\n        self.wait(0.5)\\n        self.play(TransformMatchingTex(step1.copy(), step2, path_arc=0.2))\\n        self.wait(0.5)\\n        self.play(TransformMatchingTex(step2.copy(), step3, path_arc=0.2))\\n        self.wait(0.5)\\n        brace = Brace(step3[0][9:12], direction=DOWN)\\n        note = Tex(\\"like terms\\").next_to(brace, DOWN)\\n        self.play(FadeIn(brace), FadeIn(note))\\n        self.wait(0.5)\\n        self.play(FadeOut(brace), FadeOut(note))\\n        self.play(TransformMatchingTex(step3.copy(), step4, path_arc=-0.2))\\n        box = SurroundingRectangle(step4, color=GREEN)\\n        self.play(Create(box))\\n        self.wait(1)",
  "tts": "Let's derive the expansion of (x plus y) squared algebraically. [PAUSE 1] We start by writing it as (x plus y) times (x plus y). [PAUSE 0.5] Then, distribute x over the second parenthesis and y over the first. [PAUSE 0.5] This gives x squared plus x y plus y x plus y squared. [PAUSE 1] Notice that x y and y x are like terms, combining to 2 x y. [PAUSE 0.5] So the final result is x squared plus 2 x y plus y squared. [PAUSE 2]"
}`,
    
    science: `${basePrompt}

For science questions:
- ans: Explain concepts clearly with examples using KaTeX for formulas.
- manimkatex: Create advanced Manim code with detailed animations for concepts, using diagrams, shapes, arrows, labels, and progressive builds. Include simulations or visualizations (e.g., particle motion, force diagrams) for longer videos.
- tts: Create engaging narration with [PAUSE seconds] markers matching animation transitions.

Example for physics "Newton's second law":
{
  "ans": "Newton's second law states that Force equals mass times acceleration: $F = ma$.",
  "manimkatex": "from manim import *\\n\\nclass NewtonsSecondLaw(Scene):\\n    def construct(self):\\n        title = Tex(r\\"Newton's Second Law\\")\\n        self.play(Write(title))\\n        self.wait(1)\\n        self.play(title.animate.to_edge(UP))\\n        equation = MathTex(r\\"F = ma\\")\\n        self.play(Write(equation))\\n        self.wait(0.5)\\n        force_label = Tex(\\"Force (Newtons)\\", color=BLUE).next_to(equation, DOWN, buff=0.5)\\n        mass_label = Tex(\\"Mass (kg)\\", color=GREEN).next_to(force_label, DOWN)\\n        acc_label = Tex(\\"Acceleration (m/s^2)\\", color=YELLOW).next_to(mass_label, DOWN)\\n        self.play(FadeIn(force_label), FadeIn(mass_label), FadeIn(acc_label))\\n        arrow = Arrow(LEFT, RIGHT, color=RED)\\n        self.play(Create(arrow))\\n        self.wait(2)\\n        box = SurroundingRectangle(equation, color=PURPLE)\\n        self.play(Create(box))\\n        self.wait(1)",
  "tts": "Newton's second law is fundamental to physics. [PAUSE 1] It states that force equals mass times acceleration. [PAUSE 0.5] Force is measured in Newtons. [PAUSE 0.5] Mass in kilograms. [PAUSE 0.5] And acceleration in meters per second squared. [PAUSE 2] This relationship explains how objects move under forces. [PAUSE 1]"
}`,
    
    coding: `${basePrompt}

For programming questions:
- ans: Provide working code with clear explanations, use KaTeX for complexity.
- manimkatex: Create advanced Manim code animating code execution, algorithm steps, data structures (e.g., arrays, trees with highlights, swaps), and complexity graphs for longer educational videos.
- tts: Create narration with [PAUSE seconds] markers explaining code logic step by step.

Example:
{
  "ans": "Bubble sort has time complexity $O(n^2)$ in the worst case but $O(n)$ in the best case.",
  "manimkatex": "from manim import *\\n\\nclass BubbleSortAnimation(Scene):\\n    def construct(self):\\n        title = Tex(r\\"Bubble Sort Algorithm\\")\\n        self.play(Write(title))\\n        self.wait(1)\\n        self.play(title.animate.to_edge(UP))\\n        array = [4, 3, 2, 1]\\n        rects = VGroup(*[Square(side_length=1).set_fill(BLUE, opacity=0.5) for _ in array])\\n        rects.arrange(RIGHT)\\n        labels = VGroup(*[Text(str(val)).move_to(rect) for val, rect in zip(array, rects)])\\n        self.play(Create(rects), Write(labels))\\n        self.wait(0.5)\\n        # Simulate one pass\\n        for i in range(len(array)-1):\\n            if array[i] > array[i+1]:\\n                self.play(rects[i].animate.set_fill(RED), rects[i+1].animate.set_fill(RED))\\n                self.wait(0.5)\\n                array[i], array[i+1] = array[i+1], array[i]\\n                self.play(Swap(rects[i], rects[i+1]))\\n                labels[i].set_text(str(array[i]))\\n                labels[i+1].set_text(str(array[i+1]))\\n                self.wait(0.5)\\n                self.play(rects[i].animate.set_fill(BLUE), rects[i+1].animate.set_fill(BLUE))\\n        complexity = MathTex(r\\"O(n^2)\\")\\n        self.play(Write(complexity.to_edge(DOWN)))\\n        self.wait(2)",
  "tts": "Let's visualize bubble sort. [PAUSE 1] We start with an unsorted array. [PAUSE 0.5] In each pass, we compare adjacent elements. [PAUSE 1] If they're out of order, we swap them. [PAUSE 0.5] This bubbles the largest to the end. [PAUSE 1] The worst-case complexity is O of n squared. [PAUSE 2]"
}`,
    
    history: `${basePrompt}

For historical questions:
- ans: Provide chronological context with dates using KaTeX for numbers.
- manimkatex: Create advanced Manim code with timelines, maps, event animations, fades, and highlights for detailed, longer historical narratives.
- tts: Create engaging narrative with [PAUSE seconds] markers for each historical point.

Example:
{
  "ans": "World War II lasted from $1939$ to $1945$, spanning $6$ years of global conflict.",
  "manimkatex": "from manim import *\\n\\nclass WW2Timeline(Scene):\\n    def construct(self):\\n        title = Tex(r\\"World War II Timeline\\")\\n        self.play(Write(title))\\n        self.wait(1)\\n        self.play(title.animate.to_edge(UP))\\n        timeline = NumberLine(x_range=[1939, 1945, 1], length=10)\\n        self.play(Create(timeline))\\n        start_dot = Dot(timeline.n2p(1939), color=RED)\\n        start_label = Tex(\\"1939: Start\\").next_to(start_dot, DOWN)\\n        self.play(FadeIn(start_dot), Write(start_label))\\n        self.wait(0.5)\\n        end_dot = Dot(timeline.n2p(1945), color=GREEN)\\n        end_label = Tex(\\"1945: End\\").next_to(end_dot, DOWN)\\n        self.play(FadeIn(end_dot), Write(end_label))\\n        self.wait(0.5)\\n        duration = Tex(r\\"Duration: 6 years\\").to_edge(DOWN)\\n        self.play(Write(duration))\\n        arrow = Arrow(start_dot, end_dot)\\n        self.play(Create(arrow))\\n        self.wait(2)",
  "tts": "World War Two was a defining moment in history. [PAUSE 1] It began in 1939 with the invasion of Poland. [PAUSE 0.5] The war raged across the globe for six years. [PAUSE 1] It ended in 1945 with the surrender of Axis powers. [PAUSE 0.5] This conflict reshaped the world order. [PAUSE 2]"
}`,
    
    general: `${basePrompt}

For general questions:
- ans: Structure answer logically with clear examples, use KaTeX for any math.
- manimkatex: Create advanced Manim code with detailed visual presentations, diagrams, and animations suited to the topic for longer videos.
- tts: Create conversational narration with [PAUSE seconds] markers matching visual steps.`
  };

  return subjectSpecificPrompts[subject] || subjectSpecificPrompts.general;
};

const parseAnswerIntoSteps = (answerText, subject) => {
  const steps = [];
  const lines = answerText.split('\n').filter(line => line.trim());

  let currentStep = { type: 'text', content: '' };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;

    // Detect different types of content
    if (subject === 'math' && (trimmedLine.includes('=') || trimmedLine.match(/^\d+\./))) {
      if (currentStep.content) {
        steps.push({ ...currentStep });
      }
      currentStep = { type: 'equation', content: trimmedLine };
      if (currentStep.content) {
        steps.push({ ...currentStep });
      }
      currentStep = { type: 'code', content: trimmedLine };
    } else if (subject === 'coding' && trimmedLine.startsWith('```')) {
      if (currentStep.content) {
        steps.push({ ...currentStep });
      }
      currentStep = { type: 'code', content: trimmedLine };
    } else if (trimmedLine.startsWith('Step ') || trimmedLine.match(/^\d+\./)) {
      if (currentStep.content) {
        steps.push({ ...currentStep });
      }
      currentStep = { type: 'explanation', content: trimmedLine };
    } else {
      if (currentStep.content) {
        currentStep.content += '\n' + trimmedLine;
      } else {
        currentStep.content = trimmedLine;
      }
    }
  }

  if (currentStep.content) {
    steps.push(currentStep);
  }

  return steps.length > 0 ? steps : [{ type: 'text', content: answerText }];
};

module.exports = {
  generateAnswer
};
