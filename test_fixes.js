const axios = require('axios');

async function testChatResponse() {
    console.log('🧪 Testing chat response structure...');
    
    try {
        // Test the askQuestion API
        const response = await axios.post('http://localhost:5000/api/questions/ask', {
            question: 'What is a quadratic equation?',
            subject: 'math',
            generateVideo: true
        });
        
        console.log('✅ Response received');
        console.log('📊 Response structure:');
        console.log('  - Success:', response.data.success);
        console.log('  - Data keys:', Object.keys(response.data.data || {}));
        
        if (response.data.data && response.data.data.question) {
            const question = response.data.data.question;
            console.log('📝 Question object keys:', Object.keys(question));
            
            if (question.answer) {
                console.log('🎯 Answer object keys:', Object.keys(question.answer));
                console.log('✏️ Answer.ans (first 100 chars):', question.answer.ans?.substring(0, 100) + '...');
                console.log('🎬 Answer.manimkatex exists:', !!question.answer.manimkatex);
                console.log('🎤 Answer.tts exists:', !!question.answer.tts);
                
                // This is what the frontend should display
                const chatDisplayContent = question.answer.ans || question.answer.text || 'No response received';
                console.log('💬 Chat will display:', chatDisplayContent.substring(0, 200) + '...');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('📊 Error response:', error.response.status, error.response.data);
        }
    }
}

testChatResponse();
