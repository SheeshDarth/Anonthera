import { GoogleGenerativeAI } from '@google/generative-ai'; 
// Paste your actual key inside the quotes below
const genAI = new GoogleGenerativeAI("AIzaSyD6KWQRMei4PUh_0VYawTRIF-5nlA6fQNc"); 
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); 
const result = await model.generateContent('Say hello in Hindi'); 
console.log(result.response.text());