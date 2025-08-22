
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
    
    // Parse the answer into structured steps
    const steps = parseAnswerIntoSteps(answerText, subject);
    console.log('LLM Service: Parsed steps:', steps);

    return {
      text: answerText,
      steps
    };
  } catch (error) {
    console.error('LLM Service Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};

const getSystemPrompt = (subject) => {
  const basePrompt = `You are an expert AI tutor. Provide clear, step-by-step explanations that are educational and easy to understand. Do not use <think> tags or show your internal reasoning - just provide the direct, helpful response.`;
  
  const subjectSpecificPrompts = {
    math: `${basePrompt} For mathematical problems:
- Break down the solution into clear, logical steps
- Show all calculations
- Explain the reasoning behind each step
- Use proper mathematical notation
- Include final answer verification when possible`,
    
    science: `${basePrompt} For science questions:
- Explain concepts clearly with examples
- Use analogies when helpful
- Break down complex processes into steps
- Include relevant formulas or equations
- Connect to real-world applications`,
    
    coding: `${basePrompt} For programming questions:
- Provide working code examples
- Explain the logic behind the solution
- Include comments in the code
- Mention best practices
- Explain any algorithms or data structures used`,
    
    history: `${basePrompt} For historical questions:
- Provide chronological context
- Explain causes and effects
- Include relevant dates and figures
- Connect events to broader historical themes
- Use clear, narrative structure`,
    
    general: `${basePrompt} For general questions:
- Structure your answer logically
- Use clear examples
- Break down complex topics
- Provide practical applications when relevant
- Be friendly and conversational`
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
