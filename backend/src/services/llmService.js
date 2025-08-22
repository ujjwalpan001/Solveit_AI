
const config = require('../config');
const axios = require('axios');

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

const generateAnswer = async (question, subject) => {
  try {
    console.log('LLM Service: Generating answer for question:', question, 'subject:', subject);
    const systemPrompt = getSystemPrompt(subject);
    console.log('LLM Service: System prompt:', systemPrompt);
    
    const response = await axios.post(`${endpoint}/chat/completions`, {
      model: model,
      temperature: 1.0,
      top_p: 1.0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('LLM Service: API response received');
    
    let answerText = response.data.choices[0].message.content;
    
    // Clean up the response by removing <think> tags and their content
    answerText = answerText.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
    
    console.log('LLM Service: Cleaned answer text:', answerText);
    
    // Try to parse JSON response, fallback to old format if not JSON
    let structuredAnswer;
    try {
      structuredAnswer = JSON.parse(answerText);
      console.log('LLM Service: Successfully parsed structured JSON response');
    } catch (e) {
      console.log('LLM Service: Response not in JSON format, using fallback parsing');
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
      text: structuredAnswer.ans || answerText,
      manimkatex: structuredAnswer.manimkatex || structuredAnswer.manimlatex || null,
      tts: structuredAnswer.tts || structuredAnswer.ans || answerText,
      steps: structuredAnswer.steps || parseAnswerIntoSteps(structuredAnswer.ans || answerText, subject)
    };
    
    console.log('LLM Service: Final structured answer:', answer);

    return answer;
  } catch (error) {
    console.error('LLM Service Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};

const getSystemPrompt = (subject) => {
  const basePrompt = `You are an expert AI tutor. Your response must be a valid JSON object with exactly these fields:

{
  "ans": "Clear, step-by-step explanation for the user (use inline KaTeX for math: $x^2 + 1$, $$x = \\frac{-b}{2a}$$)",
  "manimkatex": "KaTeX code specifically formatted for Manim animations (use proper MathTex syntax)",
  "tts": "Script for text-to-speech that matches the video content"
}

IMPORTANT: 
- For ans: Use KaTeX syntax for inline math $...$ and display math $$...$$ 
- For manimkatex: Use clean KaTeX without delimiters like $ or $$. Use proper MathTex format for Manim.
- For math: Include step-by-step equation transformations
- For tts: Create a natural script that narrates the visual content
- Always return valid JSON`;
  
  const subjectSpecificPrompts = {
    math: `${basePrompt}

For mathematical problems:
- ans: Provide clear step-by-step solution with explanations using KaTeX syntax for math expressions
- manimkatex: Create KaTeX for each step of the mathematical solution. Use format like:
  "2x + 5 = 15\\\\2x = 15 - 5\\\\2x = 10\\\\x = 5"
- tts: Create narration script explaining each mathematical step

Example response:
{
  "ans": "To solve $2x + 5 = 15$, we first subtract $5$ from both sides to get $2x = 10$, then divide both sides by $2$ to get $x = 5$.",
  "manimkatex": "2x + 5 = 15\\\\\\text{Subtract 5 from both sides}\\\\2x = 15 - 5\\\\2x = 10\\\\\\text{Divide both sides by 2}\\\\x = \\frac{10}{2}\\\\x = 5",
  "tts": "Let's solve this step by step. We start with 2x plus 5 equals 15. First, we subtract 5 from both sides, giving us 2x equals 10. Then, we divide both sides by 2 to find that x equals 5."
}`,
    
    science: `${basePrompt}

For science questions:
- ans: Explain concepts clearly with examples and real-world applications using KaTeX for formulas
- manimkatex: Create KaTeX for any formulas, equations, or scientific notation
- tts: Create engaging narration that explains the scientific concepts

Example for physics:
{
  "ans": "Newton's second law states that Force equals mass times acceleration: $F = ma$.",
  "manimkatex": "F = ma\\\\\\text{where } F \\text{ is force}\\\\m \\text{ is mass}\\\\a \\text{ is acceleration}",
  "tts": "Newton's second law is one of the fundamental principles of physics. It tells us that force equals mass times acceleration."
}`,
    
    coding: `${basePrompt}

For programming questions:
- ans: Provide working code examples with clear explanations, use KaTeX for complexity notation
- manimkatex: Use KaTeX for algorithms, complexity notation, or mathematical concepts in code
- tts: Create narration explaining the code logic and implementation

Example:
{
  "ans": "To sort an array, we can use the bubble sort algorithm with time complexity $O(n^2)$ in the worst case.",
  "manimkatex": "\\text{Bubble Sort Complexity}\\\\\\text{Best Case: } O(n)\\\\\\text{Worst Case: } O(n^2)\\\\\\text{Average Case: } O(n^2)",
  "tts": "Bubble sort is a simple sorting algorithm that repeatedly steps through the list and compares adjacent elements."
}`,
    
    history: `${basePrompt}

For historical questions:
- ans: Provide chronological context with dates, causes, and effects using KaTeX for dates/numbers
- manimkatex: Use KaTeX for dates, timelines, or any numerical data
- tts: Create engaging historical narrative

Example:
{
  "ans": "World War II lasted from $1939$ to $1945$, spanning $6$ years of global conflict.",
  "manimkatex": "\\text{World War II}\\\\1939 - 1945\\\\\\text{Duration: } 6 \\text{ years}",
  "tts": "World War Two was a global conflict that lasted six years, from 1939 to 1945."
}`,
    
    general: `${basePrompt}

For general questions:
- ans: Structure your answer logically with clear examples, use KaTeX for any math expressions
- manimkatex: Use KaTeX for any mathematical concepts, formulas, or structured data
- tts: Create conversational and engaging narration`
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
