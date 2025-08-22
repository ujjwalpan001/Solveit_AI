
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
  "manimkatex": "KaTeX code specifically formatted for Manim animations with synchronized steps",
  "tts": "Script for text-to-speech that matches the video content with timing markers"
}

CRITICAL: Video and audio must be perfectly synchronized!
- For ans: Use KaTeX syntax for inline math $...$ and display math $$...$$ 
- For manimkatex: Create step-by-step KaTeX that matches TTS timing exactly
- For tts: Include [PAUSE] markers to sync with visual transitions
- Always return valid JSON`;
  
  const subjectSpecificPrompts = {
    math: `${basePrompt}

For mathematical problems:
- ans: Provide clear step-by-step solution with explanations using KaTeX syntax
- manimkatex: Create synchronized KaTeX steps. Use "\\\\[STEP]" to separate visual steps that match TTS pauses:
  Format: "2x + 5 = 15\\\\[STEP]\\text{Subtract 5 from both sides}\\\\[STEP]2x = 10\\\\[STEP]\\text{Divide by 2}\\\\[STEP]x = 5"
- tts: Create narration with [PAUSE] markers that match visual steps exactly

Example response:
{
  "ans": "To solve $2x + 5 = 15$, we first subtract $5$ from both sides to get $2x = 10$, then divide both sides by $2$ to get $x = 5$.",
  "manimkatex": "2x + 5 = 15\\\\[STEP]\\text{Subtract 5 from both sides}\\\\[STEP]2x = 15 - 5\\\\[STEP]2x = 10\\\\[STEP]\\text{Divide both sides by 2}\\\\[STEP]x = \\frac{10}{2}\\\\[STEP]x = 5",
  "tts": "Let's solve this equation step by step. [PAUSE] We start with 2x plus 5 equals 15. [PAUSE] First, we subtract 5 from both sides. [PAUSE] This gives us 2x equals 10. [PAUSE] Now we divide both sides by 2. [PAUSE] And we get x equals 5. [PAUSE] That's our final answer."
}`,
    
    science: `${basePrompt}

For science questions:
- ans: Explain concepts clearly with examples using KaTeX for formulas
- manimkatex: Create step-by-step KaTeX with [STEP] markers for synchronized presentation
- tts: Create engaging narration with [PAUSE] markers matching visual transitions

Example for physics:
{
  "ans": "Newton's second law states that Force equals mass times acceleration: $F = ma$.",
  "manimkatex": "\\text{Newton's Second Law}\\\\[STEP]F = ma\\\\[STEP]\\text{where } F \\text{ is force (Newtons)}\\\\[STEP]m \\text{ is mass (kg)}\\\\[STEP]a \\text{ is acceleration (m/s²)}",
  "tts": "Newton's second law is fundamental to physics. [PAUSE] It states that force equals mass times acceleration. [PAUSE] Force is measured in Newtons. [PAUSE] Mass is measured in kilograms. [PAUSE] And acceleration is in meters per second squared. [PAUSE]"
}`,
    
    coding: `${basePrompt}

For programming questions:
- ans: Provide working code with clear explanations, use KaTeX for complexity
- manimkatex: Use step-by-step KaTeX with [STEP] for algorithms and complexity
- tts: Create narration with [PAUSE] markers explaining code logic step by step

Example:
{
  "ans": "Bubble sort has time complexity $O(n^2)$ in the worst case but $O(n)$ in the best case.",
  "manimkatex": "\\text{Bubble Sort Analysis}\\\\[STEP]\\text{Best Case: } O(n)\\\\[STEP]\\text{Average Case: } O(n^2)\\\\[STEP]\\text{Worst Case: } O(n^2)\\\\[STEP]\\text{Space Complexity: } O(1)",
  "tts": "Let's analyze bubble sort complexity. [PAUSE] In the best case, when the array is already sorted, it runs in O of n time. [PAUSE] The average case requires O of n squared comparisons. [PAUSE] The worst case, with reverse sorted data, also takes O of n squared. [PAUSE] However, it uses only O of 1 additional space. [PAUSE]"
}`,
    
    history: `${basePrompt}

For historical questions:
- ans: Provide chronological context with dates using KaTeX for numbers
- manimkatex: Create timeline with [STEP] markers for synchronized presentation
- tts: Create engaging narrative with [PAUSE] markers for each historical point

Example:
{
  "ans": "World War II lasted from $1939$ to $1945$, spanning $6$ years of global conflict.",
  "manimkatex": "\\text{World War II Timeline}\\\\[STEP]\\text{Start: } 1939\\\\[STEP]\\text{End: } 1945\\\\[STEP]\\text{Duration: } 6 \\text{ years}\\\\[STEP]\\text{Global Impact: Massive}",
  "tts": "World War Two was a defining moment in history. [PAUSE] It began in 1939 with the invasion of Poland. [PAUSE] The war continued until 1945 with Germany's surrender. [PAUSE] This global conflict lasted six full years. [PAUSE] Its impact reshaped the entire world. [PAUSE]"
}`,
    
    general: `${basePrompt}

For general questions:
- ans: Structure answer logically with clear examples, use KaTeX for any math
- manimkatex: Use step-by-step presentation with [STEP] markers for synchronized flow
- tts: Create conversational narration with [PAUSE] markers matching visual steps`
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
